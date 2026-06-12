import { Controller, Get, Post, Param, Body, Request } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto, VoidInvoiceDto, TableCheckoutDto } from './dto/sale.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller()
export class SalesController {
  constructor(private sales: SalesService) {}

  // ── Sales ──
  @Roles('CAJERO', 'DUENO', 'SUPER_ADMIN')
  @Post('sales/branch/:branchId')
  createSale(
    @Param('branchId') branchId: string,
    @Request() req,
    @Body() dto: CreateSaleDto,
  ) {
    return this.sales.createSale(branchId, req.user.sub, dto);
  }

  @Roles('CAJERO', 'DUENO', 'SUPER_ADMIN')
  @Post('sales/branch/:branchId/table-checkout')
  tableCheckout(
    @Param('branchId') branchId: string,
    @Request() req,
    @Body() dto: TableCheckoutDto,
  ) {
    return this.sales.tableCheckout(branchId, req.user.sub, dto);
  }

  @Roles('CAJERO', 'DUENO', 'SUPER_ADMIN')
  @Get('sales/branch/:branchId')
  findSales(@Param('branchId') branchId: string) {
    return this.sales.findSales(branchId);
  }

  // ── Invoices ──
  @Roles('CAJERO', 'DUENO', 'SUPER_ADMIN')
  @Get('invoices/branch/:branchId')
  findInvoices(@Param('branchId') branchId: string) {
    return this.sales.findInvoices(branchId);
  }

  @Roles('CAJERO', 'DUENO', 'SUPER_ADMIN')
  @Post('invoices/:id/request-void')
  requestVoid(@Param('id') id: string) {
    return this.sales.requestVoid(id);
  }

  @Roles('DUENO', 'SUPER_ADMIN')
  @Post('invoices/:id/void')
  approveVoid(@Param('id') id: string, @Request() req, @Body() dto: VoidInvoiceDto) {
    return this.sales.approveVoid(id, req.user.sub, dto);
  }

  @Roles('DUENO', 'SUPER_ADMIN')
  @Post('invoices/:id/reject-void')
  rejectVoid(@Param('id') id: string) {
    return this.sales.rejectVoid(id);
  }
}
