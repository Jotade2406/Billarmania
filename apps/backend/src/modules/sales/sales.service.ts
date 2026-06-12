import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSaleDto, VoidInvoiceDto, TableCheckoutDto, SaleItemDto } from './dto/sale.dto';
import { Decimal } from '@prisma/client/runtime/library';

interface ResolvedLine {
  productId: string;
  presentationId: string | null;
  quantity: number; // presentaciones vendidas
  unitPrice: number; // precio de la presentación
  subtotal: number;
  stockDeducted: number; // unidades reales descontadas (quantity × unitsPerSale)
  productName: string;
  unit: string;
}

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Resuelve items de venta (por presentación o por unidad base legacy),
   * calcula precios/stock a descontar y valida stock agregado por producto.
   */
  private async resolveItems(branchId: string, items: SaleItemDto[]): Promise<ResolvedLine[]> {
    if (!items.length) return [];

    const presIds = items.filter((i) => i.presentationId).map((i) => i.presentationId!);
    const presentations = presIds.length
      ? await this.prisma.presentation.findMany({
          where: { id: { in: presIds }, isActive: true },
          include: { product: true },
        })
      : [];

    const directIds = items.filter((i) => !i.presentationId).map((i) => i.productId!);
    const directProducts = directIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: directIds }, branchId, isActive: true },
        })
      : [];

    const lines: ResolvedLine[] = items.map((item) => {
      if (item.presentationId) {
        const pres = presentations.find((p) => p.id === item.presentationId);
        if (!pres || pres.product.branchId !== branchId || !pres.product.isActive) {
          throw new BadRequestException('Presentación no encontrada en esta sucursal');
        }
        const unitPrice = Number(pres.price);
        return {
          productId: pres.productId,
          presentationId: pres.id,
          quantity: item.quantity,
          unitPrice,
          subtotal: unitPrice * item.quantity,
          stockDeducted: item.quantity * pres.unitsPerSale,
          productName: pres.unitsPerSale > 1 ? `${pres.product.name} (${pres.name})` : pres.product.name,
          unit: pres.product.unit,
        };
      }
      if (!item.productId) {
        throw new BadRequestException('Cada item requiere presentationId o productId');
      }
      const product = directProducts.find((p) => p.id === item.productId);
      if (!product) throw new BadRequestException('Producto no encontrado en esta sucursal');
      const unitPrice = Number(product.price);
      return {
        productId: product.id,
        presentationId: null,
        quantity: item.quantity,
        unitPrice,
        subtotal: unitPrice * item.quantity,
        stockDeducted: item.quantity,
        productName: product.name,
        unit: product.unit,
      };
    });

    // Validar stock AGREGADO por producto (varias presentaciones del mismo producto en una venta)
    const needed = new Map<string, number>();
    for (const l of lines) needed.set(l.productId, (needed.get(l.productId) ?? 0) + l.stockDeducted);

    const stocks = await this.prisma.product.findMany({
      where: { id: { in: Array.from(needed.keys()) } },
      select: { id: true, name: true, stock: true, unit: true },
    });
    for (const [productId, qty] of needed) {
      const p = stocks.find((s) => s.id === productId)!;
      if (p.stock < qty) {
        throw new BadRequestException(
          `Stock insuficiente para "${p.name}". Disponible: ${p.stock} ${p.unit}, requerido: ${qty}`,
        );
      }
    }

    return lines;
  }

  /** Descuenta stock agregado por producto + registra movimientos (dentro de una tx). */
  private async deductStock(tx: any, lines: ResolvedLine[], note: string, userId: string) {
    const needed = new Map<string, number>();
    for (const l of lines) needed.set(l.productId, (needed.get(l.productId) ?? 0) + l.stockDeducted);

    for (const [productId, qty] of needed) {
      await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: qty } },
      });
    }
    if (lines.length > 0) {
      await tx.stockMovement.createMany({
        data: lines.map((l) => ({
          productId: l.productId,
          type: 'SALIDA' as const,
          quantity: l.stockDeducted,
          notes: note,
          userId,
        })),
      });
    }
  }

  async createSale(branchId: string, cashierId: string, dto: CreateSaleDto) {
    const lines = await this.resolveItems(branchId, dto.items);
    if (!lines.length) throw new BadRequestException('La venta no tiene items');

    const total = lines.reduce((acc, i) => acc + i.subtotal, 0);

    const invoiceCount = await this.prisma.invoice.count({ where: { branchId } });
    const invoiceNumber = `F-${String(invoiceCount + 1).padStart(4, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          branchId,
          cashierId,
          subtotal: total,
          total,
          customerName: dto.customerName,
          paymentMethod: dto.paymentMethod,
          notes: dto.notes,
          items: {
            create: lines.map((i) => ({
              productId: i.productId,
              presentationId: i.presentationId,
              stockDeducted: i.stockDeducted,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              subtotal: i.subtotal,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, unit: true } },
              presentation: { select: { id: true, name: true, unitsPerSale: true } },
            },
          },
        },
      });

      await this.deductStock(tx, lines, `Venta ${invoiceNumber}`, cashierId);

      const invoice = await tx.invoice.create({
        data: { saleId: sale.id, branchId, invoiceNumber },
      });

      return { sale, invoice };
    }, { timeout: 30000, maxWait: 10000 });
  }

  /**
   * Cobro de mesa: cierra la sesión de juego (tiempo × tarifa), suma consumo
   * opcional, descuenta el anticipo si hubo reserva, factura y libera la mesa.
   */
  async tableCheckout(branchId: string, cashierId: string, dto: TableCheckoutDto) {
    const table = await this.prisma.table.findUnique({ where: { id: dto.tableId } });
    if (!table || table.branchId !== branchId) throw new NotFoundException('Mesa no encontrada');
    if (table.status !== 'OCUPADA') throw new BadRequestException('La mesa no está ocupada');

    // Tiempo jugado (mínimo 1 minuto si hay cronómetro)
    const rate = table.hourlyRate ? Number(table.hourlyRate) : 0;
    const tableMinutes = table.occupiedAt
      ? Math.max(1, Math.ceil((Date.now() - table.occupiedAt.getTime()) / 60000))
      : 0;
    // Redondeo hacia arriba a Bs enteros (nadie cobra 0.33 en efectivo)
    const tableAmount = Math.ceil(rate * (tableMinutes / 60));

    // Consumo opcional (por presentación o unidad base)
    const lines = await this.resolveItems(branchId, dto.items ?? []);
    const itemsTotal = lines.reduce((acc, i) => acc + i.subtotal, 0);

    // Anticipo de reserva activa (ya verificado por el cajero al confirmar)
    const reservation = await this.prisma.reservation.findFirst({
      where: { tableId: table.id, status: 'ACTIVA' },
    });
    const gross = Math.round((tableAmount + itemsTotal) * 100) / 100;
    const prepaidApplied = reservation
      ? Math.min(Number(reservation.depositAmount), gross)
      : 0;
    const total = Math.round((gross - prepaidApplied) * 100) / 100;

    const invoiceCount = await this.prisma.invoice.count({ where: { branchId } });
    const invoiceNumber = `F-${String(invoiceCount + 1).padStart(4, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          branchId,
          cashierId,
          subtotal: gross,
          total,
          customerName: dto.customerName,
          paymentMethod: dto.paymentMethod,
          tableLabel: table.label,
          tableMinutes,
          tableAmount,
          prepaidApplied: prepaidApplied || null,
          items: {
            create: lines.map((i) => ({
              productId: i.productId,
              presentationId: i.presentationId,
              stockDeducted: i.stockDeducted,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              subtotal: i.subtotal,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, unit: true } },
              presentation: { select: { id: true, name: true, unitsPerSale: true } },
            },
          },
        },
      });

      await this.deductStock(tx, lines, `Venta ${invoiceNumber} (mesa ${table.label})`, cashierId);

      const invoice = await tx.invoice.create({
        data: { saleId: sale.id, branchId, invoiceNumber },
      });

      // Liberar mesa y cerrar reserva si la hubo
      await tx.table.update({
        where: { id: table.id },
        data: { status: 'LIBRE', occupiedAt: null },
      });
      if (reservation) {
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: 'COMPLETADA' },
        });
      }

      return { sale, invoice };
    }, { timeout: 30000, maxWait: 10000 });
  }

  findSales(branchId: string) {
    return this.prisma.sale.findMany({
      where: { branchId },
      include: {
        cashier: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, unit: true } },
            presentation: { select: { id: true, name: true, unitsPerSale: true } },
          },
        },
        invoice: { select: { id: true, invoiceNumber: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  findInvoices(branchId: string) {
    return this.prisma.invoice.findMany({
      where: { branchId },
      include: {
        sale: {
          include: {
            cashier: { select: { id: true, name: true } },
            items: {
              include: {
                product: { select: { id: true, name: true } },
                presentation: { select: { id: true, name: true, unitsPerSale: true } },
              },
            },
          },
        },
        voidedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async requestVoid(invoiceId: string) {
    const invoice = await this.findInvoice(invoiceId);
    if (invoice.status !== 'ACTIVA') {
      throw new BadRequestException('La factura no está activa');
    }
    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'PENDIENTE_ANULACION' },
    });
  }

  async approveVoid(invoiceId: string, userId: string, dto: VoidInvoiceDto) {
    const invoice = await this.findInvoice(invoiceId);
    if (invoice.status === 'ANULADA') {
      throw new BadRequestException('La factura ya está anulada');
    }

    return this.prisma.$transaction(async (tx) => {
      // Mark invoice and sale as voided
      const updated = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'ANULADA',
          voidReason: dto.reason,
          voidedById: userId,
          voidedAt: new Date(),
        },
      });
      await tx.sale.update({
        where: { id: invoice.saleId },
        data: { status: 'ANULADA' },
      });

      // Restore stock for each item in the sale
      const sale = await tx.sale.findUnique({
        where: { id: invoice.saleId },
        include: { items: true },
      });
      // Restituir las unidades REALES descontadas (stockDeducted; legacy = quantity)
      for (const item of sale!.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.stockDeducted ?? item.quantity } },
        });
      }
      if (sale!.items.length > 0) {
        await tx.stockMovement.createMany({
          data: sale!.items.map((item) => ({
            productId: item.productId,
            type: 'ENTRADA' as const,
            quantity: item.stockDeducted ?? item.quantity,
            notes: `Anulación factura ${updated.invoiceNumber}: ${dto.reason}`,
            userId,
          })),
        });
      }

      return updated;
    }, { timeout: 30000, maxWait: 10000 });
  }

  async rejectVoid(invoiceId: string) {
    const invoice = await this.findInvoice(invoiceId);
    if (invoice.status !== 'PENDIENTE_ANULACION') {
      throw new BadRequestException('La factura no está pendiente de anulación');
    }
    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'ACTIVA' },
    });
  }

  private async findInvoice(id: string) {
    const inv = await this.prisma.invoice.findUnique({ where: { id } });
    if (!inv) throw new NotFoundException('Factura no encontrada');
    return inv;
  }
}
