import { Controller, Get, Post, Put, Delete, Param, Body, Request } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateProductDto, UpdateProductDto, AddStockDto } from './dto/product.dto';
import { CreatePresentationDto, UpdatePresentationDto } from './dto/presentation.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('inventory')
export class InventoryController {
  constructor(private inventory: InventoryService) {}

  @Roles('CAJERO', 'DUENO', 'SUPER_ADMIN')
  @Get('branch/:branchId')
  findAll(@Param('branchId') branchId: string) {
    return this.inventory.findAll(branchId);
  }

  @Roles('CAJERO', 'DUENO', 'SUPER_ADMIN')
  @Get('branch/:branchId/alerts')
  getAlerts(@Param('branchId') branchId: string) {
    return this.inventory.getAlerts(branchId);
  }

  // App cliente: menú visible (cualquier usuario autenticado, sin datos internos)
  @Get('branch/:branchId/menu')
  getMenu(@Param('branchId') branchId: string) {
    return this.inventory.getMenu(branchId);
  }

  // ── Presentaciones ──
  @Roles('DUENO', 'SUPER_ADMIN')
  @Post('products/:id/presentations')
  addPresentation(@Param('id') id: string, @Body() dto: CreatePresentationDto) {
    return this.inventory.addPresentation(id, dto);
  }

  @Roles('DUENO', 'SUPER_ADMIN')
  @Put('products/:id/presentations/:presId')
  updatePresentation(
    @Param('id') id: string,
    @Param('presId') presId: string,
    @Body() dto: UpdatePresentationDto,
  ) {
    return this.inventory.updatePresentation(id, presId, dto);
  }

  @Roles('DUENO', 'SUPER_ADMIN')
  @Delete('products/:id/presentations/:presId')
  removePresentation(@Param('id') id: string, @Param('presId') presId: string) {
    return this.inventory.removePresentation(id, presId);
  }

  @Roles('DUENO', 'SUPER_ADMIN')
  @Post('branch/:branchId')
  create(@Param('branchId') branchId: string, @Body() dto: CreateProductDto) {
    return this.inventory.create(branchId, dto);
  }

  @Roles('DUENO', 'SUPER_ADMIN')
  @Put('products/:id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.inventory.update(id, dto);
  }

  @Roles('DUENO', 'SUPER_ADMIN')
  @Delete('products/:id')
  remove(@Param('id') id: string) {
    return this.inventory.remove(id);
  }

  @Roles('CAJERO', 'DUENO', 'SUPER_ADMIN')
  @Post('products/:id/stock')
  addStock(@Param('id') id: string, @Request() req, @Body() dto: AddStockDto) {
    return this.inventory.addStock(id, req.user.sub, dto);
  }

  @Roles('CAJERO', 'DUENO', 'SUPER_ADMIN')
  @Get('products/:id/movements')
  getMovements(@Param('id') id: string) {
    return this.inventory.getMovements(id);
  }
}
