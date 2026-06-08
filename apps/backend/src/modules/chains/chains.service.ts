import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChainsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.chain.findMany({
      include: { _count: { select: { branches: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const chain = await this.prisma.chain.findUnique({
      where: { id },
      include: { branches: { select: { id: true, name: true, address: true, openTime: true, closeTime: true } } },
    });
    if (!chain) throw new NotFoundException('Cadena no encontrada');
    return chain;
  }

  findBranches(chainId: string) {
    return this.prisma.branch.findMany({
      where: { chainId },
      include: { _count: { select: { tables: true } } },
    });
  }
}
