import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReservationStatus, TableStatus } from '@prisma/client';
import { CreateReservationDto } from './dto/create-reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateReservationDto) {
    const [table, branch] = await Promise.all([
      this.prisma.table.findUnique({ where: { id: dto.tableId } }),
      this.prisma.branch.findUnique({ where: { id: dto.branchId } }),
    ]);

    if (!table) throw new NotFoundException('Mesa no encontrada');
    if (!branch) throw new NotFoundException('Sucursal no encontrada');
    if (table.status !== TableStatus.LIBRE)
      throw new BadRequestException('La mesa no está disponible');

    await this.prisma.table.update({
      where: { id: dto.tableId },
      data: { status: TableStatus.RESERVADA },
    });

    const depositAmount = table.hourlyRate
      ? table.hourlyRate.mul(2)
      : branch.depositAmount;

    return this.prisma.reservation.create({
      data: {
        tableId: dto.tableId,
        branchId: dto.branchId,
        userId,
        reservedFor: new Date(dto.reservedFor),
        depositAmount,
        status: ReservationStatus.PENDIENTE_PAGO,
      },
    });
  }

  async uploadProof(reservationId: string, userId: string, proofUrl: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { branch: true },
    });

    if (!reservation) throw new NotFoundException('Reserva no encontrada');
    if (reservation.userId !== userId) throw new ForbiddenException();
    if (reservation.status !== ReservationStatus.PENDIENTE_PAGO)
      throw new BadRequestException('La reserva no está en estado PENDIENTE_PAGO');

    const confirmationDeadline = new Date(
      Date.now() + reservation.branch.confirmationTimeoutMin * 60 * 1000,
    );

    const [updatedReservation, payment] = await this.prisma.$transaction([
      this.prisma.reservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.EN_REVISION,
          confirmationDeadline,
        },
      }),
      this.prisma.payment.create({
        data: {
          reservationId,
          amount: reservation.depositAmount,
          proofUrl,
          status: 'PENDIENTE',
        },
      }),
    ]);

    return { reservation: updatedReservation, payment };
  }

  async confirm(reservationId: string, reviewerId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { branch: true },
    });

    if (!reservation) throw new NotFoundException('Reserva no encontrada');
    if (reservation.status !== ReservationStatus.EN_REVISION)
      throw new BadRequestException('La reserva no está en estado EN_REVISION');

    const deadline = new Date(
      reservation.reservedFor.getTime() +
        reservation.branch.reservationGraceMinutes * 60 * 1000,
    );

    const [updatedReservation] = await this.prisma.$transaction([
      this.prisma.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.CONFIRMADA, deadline },
      }),
      this.prisma.payment.update({
        where: { reservationId },
        data: { status: 'VERIFICADO', reviewedById: reviewerId, reviewedAt: new Date() },
      }),
    ]);

    return updatedReservation;
  }

  async reject(reservationId: string, reviewerId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) throw new NotFoundException('Reserva no encontrada');
    if (reservation.status !== ReservationStatus.EN_REVISION)
      throw new BadRequestException('La reserva no está en estado EN_REVISION');

    await this.prisma.$transaction([
      this.prisma.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.CANCELADA },
      }),
      this.prisma.payment.update({
        where: { reservationId },
        data: { status: 'RECHAZADO', reviewedById: reviewerId, reviewedAt: new Date() },
      }),
      this.prisma.table.update({
        where: { id: reservation.tableId },
        data: { status: TableStatus.LIBRE },
      }),
    ]);

    return { message: 'Reserva rechazada y mesa liberada' };
  }

  async checkIn(reservationId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) throw new NotFoundException('Reserva no encontrada');
    if (reservation.status !== ReservationStatus.CONFIRMADA)
      throw new BadRequestException('La reserva no está confirmada');

    if (reservation.deadline && new Date() > reservation.deadline)
      throw new BadRequestException('La reserva ya venció');

    await this.prisma.$transaction([
      this.prisma.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.ACTIVA },
      }),
      this.prisma.table.update({
        where: { id: reservation.tableId },
        data: { status: TableStatus.OCUPADA, occupiedAt: new Date() },
      }),
    ]);

    return { message: 'Check-in exitoso, mesa ocupada' };
  }

  async cancel(reservationId: string, userId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) throw new NotFoundException('Reserva no encontrada');
    if (reservation.userId !== userId) throw new ForbiddenException();

    const cancelable: ReservationStatus[] = [
      ReservationStatus.PENDIENTE_PAGO,
      ReservationStatus.EN_REVISION,
      ReservationStatus.CONFIRMADA,
    ];
    if (!cancelable.includes(reservation.status))
      throw new BadRequestException('No se puede cancelar en el estado actual');

    await this.prisma.$transaction([
      this.prisma.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.CANCELADA },
      }),
      this.prisma.table.update({
        where: { id: reservation.tableId },
        data: { status: TableStatus.LIBRE },
      }),
    ]);

    return { message: 'Reserva cancelada' };
  }

  findMyReservations(userId: string) {
    return this.prisma.reservation.findMany({
      where: { userId },
      include: {
        table: { select: { label: true } },
        branch: { select: { id: true, name: true, address: true } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(reservationId: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        table: { select: { label: true } },
        branch: { select: { name: true, address: true, confirmationTimeoutMin: true, depositAmount: true, reservationGraceMinutes: true } },
        user: { select: { name: true, phone: true } },
        payment: true,
      },
    });
    if (!reservation) throw new NotFoundException('Reserva no encontrada');
    return reservation;
  }

  findPendingForBranch(branchId: string) {
    return this.prisma.reservation.findMany({
      where: { branchId, status: ReservationStatus.EN_REVISION },
      include: {
        user: { select: { name: true, phone: true } },
        table: { select: { label: true } },
        payment: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
