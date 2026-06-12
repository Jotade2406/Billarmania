import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
import { CreatePaymentMethodDto } from './dto/payment-method.dto';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: { chain: { select: { id: true, name: true, logoUrl: true } } },
    });
    if (!branch) throw new NotFoundException('Sucursal no encontrada');
    return branch;
  }

  findPaymentMethods(branchId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { branchId, isActive: true },
      select: { id: true, type: true, displayName: true, qrImageUrl: true, accountInfo: true },
    });
  }

  findTables(branchId: string) {
    return this.prisma.table.findMany({
      where: { branchId },
      select: { id: true, label: true, status: true, hourlyRate: true, occupiedAt: true },
      orderBy: { label: 'asc' },
    });
  }

  async create(chainId: string, dto: CreateBranchDto) {
    return this.prisma.branch.create({
      data: { ...dto, chainId },
    });
  }

  async createDirect(adminId: string, dto: CreateBranchDto) {
    const chain = await this.prisma.chain.create({
      data: { name: dto.name, ownerId: adminId },
    });
    return this.prisma.branch.create({ data: { ...dto, chainId: chain.id } });
  }

  async findAll() {
    return this.prisma.branch.findMany({
      include: {
        chain: { select: { id: true, name: true } },
        _count: { select: { tables: true, staff: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, dto: UpdateBranchDto) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('Sucursal no encontrada');
    return this.prisma.branch.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('Sucursal no encontrada');
    return this.prisma.branch.delete({ where: { id } });
  }

  async createPaymentMethod(branchId: string, dto: CreatePaymentMethodDto) {
    return this.prisma.paymentMethod.create({
      data: { ...dto, branchId },
    });
  }

  async removePaymentMethod(pmId: string) {
    return this.prisma.paymentMethod.update({
      where: { id: pmId },
      data: { isActive: false },
    });
  }

  async getStats(branchId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [tables, reservationsToday, pendingReservations] = await Promise.all([
      this.prisma.table.groupBy({
        by: ['status'],
        where: { branchId },
        _count: true,
      }),
      this.prisma.reservation.count({
        where: {
          branchId,
          createdAt: { gte: today, lt: tomorrow },
        },
      }),
      this.prisma.reservation.count({
        where: { branchId, status: 'EN_REVISION' },
      }),
    ]);

    const statusMap = Object.fromEntries(tables.map((t) => [t.status, t._count]));
    return {
      tables: {
        LIBRE: statusMap['LIBRE'] ?? 0,
        OCUPADA: statusMap['OCUPADA'] ?? 0,
        RESERVADA: statusMap['RESERVADA'] ?? 0,
        FUERA_DE_SERVICIO: statusMap['FUERA_DE_SERVICIO'] ?? 0,
        total: tables.reduce((acc, t) => acc + t._count, 0),
      },
      reservationsToday,
      pendingReservations,
    };
  }

  async findAllReservations(branchId: string, status?: string) {
    return this.prisma.reservation.findMany({
      where: {
        branchId,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        table: { select: { id: true, label: true } },
        payment: { select: { id: true, proofUrl: true, status: true, amount: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findStaff(branchId: string) {
    return this.prisma.user.findMany({
      where: { staffBranchId: branchId, role: 'CAJERO' },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAllStaff() {
    return this.prisma.user.findMany({
      where: { role: { in: ['CAJERO', 'DUENO'] } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        staffBranch: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }
}
