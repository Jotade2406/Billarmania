import { Injectable, NotFoundException } from '@nestjs/common';
import { TableStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTableDto, UpdateTableDto } from './dto/table.dto';

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) {}

  async updateStatus(tableId: string, status: TableStatus) {
    const table = await this.prisma.table.findUnique({ where: { id: tableId } });
    if (!table) throw new NotFoundException('Mesa no encontrada');

    // Cronómetro de sesión: arranca al ocupar, se limpia al liberar
    const occupiedAt =
      status === 'OCUPADA' ? new Date() : status === 'LIBRE' ? null : table.occupiedAt;

    return this.prisma.table.update({
      where: { id: tableId },
      data: { status, occupiedAt },
      select: { id: true, label: true, status: true, occupiedAt: true, branchId: true },
    });
  }

  /**
   * Estado de la sesión de una mesa: tiempo transcurrido, monto calculado
   * y reserva vinculada (activa o confirmada) si existe.
   */
  async getSession(tableId: string) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      select: { id: true, label: true, status: true, hourlyRate: true, occupiedAt: true, branchId: true },
    });
    if (!table) throw new NotFoundException('Mesa no encontrada');

    const reservation = await this.prisma.reservation.findFirst({
      where: { tableId, status: { in: ['ACTIVA', 'CONFIRMADA'] } },
      orderBy: { reservedFor: 'asc' },
      select: {
        id: true,
        status: true,
        reservedFor: true,
        depositAmount: true,
        user: { select: { name: true, phone: true } },
      },
    });

    const rate = table.hourlyRate ? Number(table.hourlyRate) : 0;
    const minutes = table.occupiedAt
      ? Math.max(1, Math.ceil((Date.now() - table.occupiedAt.getTime()) / 60000))
      : 0;
    // Redondeo hacia arriba a Bs enteros (nadie cobra 0.33 en efectivo)
    const tableAmount = Math.ceil(rate * (minutes / 60));
    const prepaid = reservation?.status === 'ACTIVA' ? Number(reservation.depositAmount) : 0;

    return {
      table,
      minutes,
      rate,
      tableAmount,
      prepaid,
      reservation,
    };
  }

  async create(branchId: string, dto: CreateTableDto) {
    return this.prisma.table.create({
      data: { ...dto, branchId, status: 'LIBRE' },
      select: { id: true, label: true, status: true, hourlyRate: true, branchId: true },
    });
  }

  async update(tableId: string, dto: UpdateTableDto) {
    const table = await this.prisma.table.findUnique({ where: { id: tableId } });
    if (!table) throw new NotFoundException('Mesa no encontrada');
    return this.prisma.table.update({
      where: { id: tableId },
      data: dto,
      select: { id: true, label: true, status: true, hourlyRate: true },
    });
  }

  async remove(tableId: string) {
    const table = await this.prisma.table.findUnique({ where: { id: tableId } });
    if (!table) throw new NotFoundException('Mesa no encontrada');
    return this.prisma.table.delete({ where: { id: tableId } });
  }
}
