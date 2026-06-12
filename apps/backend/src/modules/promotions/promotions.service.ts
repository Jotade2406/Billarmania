import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/promotion.dto';

const MAX_ACTIVE_PROMOS = 5;

const PROMO_INCLUDE = {
  presentation: {
    select: {
      id: true,
      name: true,
      unitsPerSale: true,
      price: true,
      product: { select: { id: true, name: true, imageUrl: true, stock: true } },
    },
  },
  branch: { select: { id: true, name: true } },
} as const;

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  /** Vigentes para la app del cliente (activas, dentro de fechas, con usos disponibles). */
  async findActive(branchId?: string) {
    const now = new Date();
    const promos = await this.prisma.promotion.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        isActive: true,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      include: PROMO_INCLUDE,
      orderBy: { validUntil: 'asc' },
      take: 20,
    });
    // maxUses agotado se filtra acá (Prisma no compara columnas entre sí)
    return promos
      .filter((p) => p.maxUses == null || p.currentUses < p.maxUses)
      .map((p) => ({
        ...p,
        savings: Number(p.originalPrice) - Number(p.promoPrice),
        usesLeft: p.maxUses != null ? p.maxUses - p.currentUses : null,
      }));
  }

  /** Todas las promos de la sucursal con estado calculado (panel del dueño). */
  async findAll(branchId: string) {
    const now = new Date();
    const promos = await this.prisma.promotion.findMany({
      where: { branchId },
      include: PROMO_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return promos.map((p) => {
      let status: 'activa' | 'programada' | 'vencida' | 'agotada' | 'inactiva';
      if (!p.isActive) status = 'inactiva';
      else if (p.maxUses != null && p.currentUses >= p.maxUses) status = 'agotada';
      else if (p.validUntil < now) status = 'vencida';
      else if (p.validFrom > now) status = 'programada';
      else status = 'activa';
      return { ...p, status, savings: Number(p.originalPrice) - Number(p.promoPrice) };
    });
  }

  async create(branchId: string, dto: CreatePromotionDto) {
    const presentation = await this.prisma.presentation.findUnique({
      where: { id: dto.presentationId },
      include: { product: { select: { branchId: true, name: true } } },
    });
    if (!presentation || presentation.product.branchId !== branchId) {
      throw new NotFoundException('Presentación no encontrada en esta sucursal');
    }

    const originalPrice = Number(presentation.price);
    if (dto.promoPrice >= originalPrice) {
      throw new BadRequestException(
        `El precio promocional (Bs ${dto.promoPrice}) debe ser menor al original (Bs ${originalPrice})`,
      );
    }

    const from = new Date(dto.validFrom);
    const until = new Date(dto.validUntil);
    if (until <= from) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la de inicio');
    }

    // Máximo 5 promociones activas vigentes por sucursal
    const now = new Date();
    const activeCount = await this.prisma.promotion.count({
      where: { branchId, isActive: true, validUntil: { gte: now } },
    });
    if (activeCount >= MAX_ACTIVE_PROMOS) {
      throw new BadRequestException(
        `Máximo ${MAX_ACTIVE_PROMOS} promociones activas simultáneas. Desactiva alguna primero.`,
      );
    }

    return this.prisma.promotion.create({
      data: {
        branchId,
        presentationId: dto.presentationId,
        title: dto.title,
        description: dto.description,
        imageUrl: dto.imageUrl,
        originalPrice,
        promoPrice: dto.promoPrice,
        validFrom: from,
        validUntil: until,
        maxUses: dto.maxUses,
      },
      include: PROMO_INCLUDE,
    });
  }

  async update(id: string, dto: UpdatePromotionDto) {
    const promo = await this.findOne(id);
    if (dto.promoPrice != null && dto.promoPrice >= Number(promo.originalPrice)) {
      throw new BadRequestException('El precio promocional debe ser menor al original');
    }
    return this.prisma.promotion.update({
      where: { id },
      data: {
        ...dto,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
      include: PROMO_INCLUDE,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.promotion.delete({ where: { id } });
  }

  async toggle(id: string) {
    const promo = await this.findOne(id);
    return this.prisma.promotion.update({
      where: { id },
      data: { isActive: !promo.isActive },
    });
  }

  private async findOne(id: string) {
    const promo = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException('Promoción no encontrada');
    return promo;
  }
}
