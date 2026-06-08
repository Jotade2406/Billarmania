import { Injectable, NotFoundException } from '@nestjs/common';
import { TableStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) {}

  async updateStatus(tableId: string, status: TableStatus) {
    const table = await this.prisma.table.findUnique({ where: { id: tableId } });
    if (!table) throw new NotFoundException('Mesa no encontrada');

    return this.prisma.table.update({
      where: { id: tableId },
      data: { status },
      select: { id: true, label: true, status: true, branchId: true },
    });
  }
}
