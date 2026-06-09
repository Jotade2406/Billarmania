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
    return this.prisma.table.update({
      where: { id: tableId },
      data: { status },
      select: { id: true, label: true, status: true, branchId: true },
    });
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
