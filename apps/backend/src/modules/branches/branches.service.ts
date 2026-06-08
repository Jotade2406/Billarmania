import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
      select: { id: true, label: true, status: true, hourlyRate: true },
      orderBy: { label: 'asc' },
    });
  }
}
