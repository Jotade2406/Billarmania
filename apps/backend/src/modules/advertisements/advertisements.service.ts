import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAdvertisementDto, UpdateAdvertisementDto } from './dto/advertisement.dto';

@Injectable()
export class AdvertisementsService {
  constructor(private prisma: PrismaService) {}

  /** Anuncios visibles para la app del cliente: activos y dentro de su vigencia. */
  findActive(branchId: string) {
    const now = new Date();
    return this.prisma.advertisement.findMany({
      where: {
        branchId,
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { position: 'asc' },
    });
  }

  /** Todos los anuncios visibles del conjunto de sucursales (home del cliente). */
  findActiveGlobal() {
    const now = new Date();
    return this.prisma.advertisement.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      take: 10,
    });
  }

  /** Todos los anuncios de la sucursal (panel del dueño). */
  findAll(branchId: string) {
    return this.prisma.advertisement.findMany({
      where: { branchId },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    });
  }

  create(branchId: string, dto: CreateAdvertisementDto) {
    return this.prisma.advertisement.create({
      data: {
        ...dto,
        branchId,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      },
    });
  }

  async update(id: string, dto: UpdateAdvertisementDto) {
    await this.findOne(id);
    return this.prisma.advertisement.update({
      where: { id },
      data: {
        ...dto,
        startsAt: dto.startsAt !== undefined ? (dto.startsAt ? new Date(dto.startsAt) : null) : undefined,
        endsAt: dto.endsAt !== undefined ? (dto.endsAt ? new Date(dto.endsAt) : null) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.advertisement.delete({ where: { id } });
  }

  async toggle(id: string) {
    const ad = await this.findOne(id);
    return this.prisma.advertisement.update({
      where: { id },
      data: { isActive: !ad.isActive },
    });
  }

  registerView(id: string) {
    return this.prisma.advertisement.update({
      where: { id },
      data: { views: { increment: 1 } },
    });
  }

  private async findOne(id: string) {
    const ad = await this.prisma.advertisement.findUnique({ where: { id } });
    if (!ad) throw new NotFoundException('Anuncio no encontrado');
    return ad;
  }
}
