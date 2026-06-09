import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChainDto, UpdateChainDto } from './dto/chain.dto';
import { CreateBranchDto } from '../branches/dto/branch.dto';

@Injectable()
export class ChainsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.chain.findMany({
      include: { _count: { select: { branches: true } } },
      orderBy: { name: 'asc' },
    });
  }

  findByOwner(ownerId: string) {
    return this.prisma.chain.findMany({
      where: { ownerId },
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

  create(ownerId: string, dto: CreateChainDto) {
    return this.prisma.chain.create({
      data: { ...dto, ownerId },
    });
  }

  async update(id: string, ownerId: string, dto: UpdateChainDto) {
    const chain = await this.prisma.chain.findUnique({ where: { id } });
    if (!chain) throw new NotFoundException('Cadena no encontrada');
    if (chain.ownerId !== ownerId) throw new ForbiddenException();
    return this.prisma.chain.update({ where: { id }, data: dto });
  }

  createBranch(chainId: string, dto: CreateBranchDto) {
    return this.prisma.branch.create({ data: { ...dto, chainId } });
  }

  async remove(id: string, ownerId: string) {
    const chain = await this.prisma.chain.findUnique({ where: { id } });
    if (!chain) throw new NotFoundException('Cadena no encontrada');
    if (chain.ownerId !== ownerId) throw new ForbiddenException();
    return this.prisma.chain.delete({ where: { id } });
  }
}
