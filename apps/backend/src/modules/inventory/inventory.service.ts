import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto, AddStockDto } from './dto/product.dto';
import { CreatePresentationDto, UpdatePresentationDto } from './dto/presentation.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Productos con sus presentaciones activas. Cada presentación incluye
   * `available`: si el stock alcanza para venderla (stock >= unitsPerSale).
   */
  async findAll(branchId: string) {
    const products = await this.prisma.product.findMany({
      where: { branchId, isActive: true },
      include: {
        presentations: {
          where: { isActive: true },
          orderBy: { unitsPerSale: 'asc' },
        },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return products.map((p) => ({
      ...p,
      stockLevel: this.stockLevel(p.stock, p.minStockAlert),
      presentations: p.presentations.map((pr) => ({
        ...pr,
        available: p.stock >= pr.unitsPerSale,
      })),
    }));
  }

  /**
   * Menú para la app del cliente: productos activos con sus presentaciones
   * y disponibilidad, SIN datos internos (costo, umbrales de alerta).
   */
  async getMenu(branchId: string) {
    const products = await this.prisma.product.findMany({
      where: { branchId, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        imageUrl: true,
        unit: true,
        stock: true,
        presentations: {
          where: { isActive: true },
          select: { id: true, name: true, description: true, unitsPerSale: true, price: true },
          orderBy: { unitsPerSale: 'asc' },
        },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category ?? 'Otros',
      imageUrl: p.imageUrl,
      unit: p.unit,
      agotado: p.stock <= 0,
      presentations: p.presentations.map((pr) => ({
        ...pr,
        available: p.stock >= pr.unitsPerSale,
      })),
    }));
  }

  /** Productos con stock bajo o crítico (para alertas del dueño). */
  async getAlerts(branchId: string) {
    const products = await this.prisma.product.findMany({
      where: { branchId, isActive: true },
      select: { id: true, name: true, stock: true, unit: true, minStockAlert: true },
      orderBy: { stock: 'asc' },
    });
    return products
      .map((p) => ({ ...p, stockLevel: this.stockLevel(p.stock, p.minStockAlert) }))
      .filter((p) => p.stockLevel !== 'normal');
  }

  private stockLevel(stock: number, minAlert: number): 'normal' | 'bajo' | 'critico' {
    if (stock < 5) return 'critico';
    if (stock < minAlert) return 'bajo';
    return 'normal';
  }

  /** Crea el producto + su presentación base "Unidad" (compat con POS). */
  async create(branchId: string, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        ...dto,
        branchId,
        stock: dto.stock ?? 0,
        presentations: {
          create: { name: 'Unidad', unitsPerSale: 1, price: dto.price },
        },
      },
      include: { presentations: true },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findProduct(id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findProduct(id);
    return this.prisma.product.update({ where: { id }, data: { isActive: false } });
  }

  // ── Presentaciones ────────────────────────────────────────────────

  async addPresentation(productId: string, dto: CreatePresentationDto) {
    await this.findProduct(productId);
    return this.prisma.presentation.create({
      data: { ...dto, productId },
    });
  }

  async updatePresentation(productId: string, presentationId: string, dto: UpdatePresentationDto) {
    const pres = await this.prisma.presentation.findUnique({ where: { id: presentationId } });
    if (!pres || pres.productId !== productId) {
      throw new NotFoundException('Presentación no encontrada');
    }
    return this.prisma.presentation.update({ where: { id: presentationId }, data: dto });
  }

  async removePresentation(productId: string, presentationId: string) {
    const pres = await this.prisma.presentation.findUnique({ where: { id: presentationId } });
    if (!pres || pres.productId !== productId) {
      throw new NotFoundException('Presentación no encontrada');
    }
    // La única presentación activa no se puede desactivar (el producto quedaría invendible)
    const activeCount = await this.prisma.presentation.count({
      where: { productId, isActive: true },
    });
    if (activeCount <= 1 && pres.isActive) {
      throw new BadRequestException('No puedes desactivar la única presentación del producto');
    }
    return this.prisma.presentation.update({
      where: { id: presentationId },
      data: { isActive: false },
    });
  }

  // ── Stock ─────────────────────────────────────────────────────────

  async addStock(id: string, userId: string, dto: AddStockDto) {
    await this.findProduct(id);
    return this.prisma.$transaction(async (tx) => {
      await tx.stockMovement.create({
        data: {
          productId: id,
          type: 'ENTRADA',
          quantity: dto.quantity,
          notes: dto.notes,
          userId,
        },
      });
      return tx.product.update({
        where: { id },
        data: { stock: { increment: dto.quantity } },
      });
    }, { timeout: 30000, maxWait: 10000 });
  }

  async removeStock(id: string, userId: string, quantity: number, notes?: string) {
    const product = await this.findProduct(id);
    if (product.stock < quantity) {
      throw new BadRequestException(`Stock insuficiente (disponible: ${product.stock})`);
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.stockMovement.create({
        data: { productId: id, type: 'SALIDA', quantity, notes, userId },
      });
      return tx.product.update({
        where: { id },
        data: { stock: { decrement: quantity } },
      });
    }, { timeout: 30000, maxWait: 10000 });
  }

  getMovements(productId: string) {
    return this.prisma.stockMovement.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  private async findProduct(id: string) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Producto no encontrado');
    return p;
  }
}
