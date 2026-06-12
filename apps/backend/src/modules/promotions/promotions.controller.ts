import { Controller, Get, Post, Put, Delete, Patch, Param, Body } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/promotion.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('promotions')
export class PromotionsController {
  constructor(private promos: PromotionsService) {}

  // App cliente: promos vigentes de todas las sucursales (home)
  @Get('active')
  findActiveGlobal() {
    return this.promos.findActive();
  }

  // App cliente: promos vigentes de una sucursal
  @Get('branch/:branchId')
  findActive(@Param('branchId') branchId: string) {
    return this.promos.findActive(branchId);
  }

  // Panel dueño
  @Roles('DUENO', 'SUPER_ADMIN')
  @Get('manage/:branchId')
  findAll(@Param('branchId') branchId: string) {
    return this.promos.findAll(branchId);
  }

  @Roles('DUENO', 'SUPER_ADMIN')
  @Post('branch/:branchId')
  create(@Param('branchId') branchId: string, @Body() dto: CreatePromotionDto) {
    return this.promos.create(branchId, dto);
  }

  @Roles('DUENO', 'SUPER_ADMIN')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.promos.update(id, dto);
  }

  @Roles('DUENO', 'SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promos.remove(id);
  }

  @Roles('DUENO', 'SUPER_ADMIN')
  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.promos.toggle(id);
  }
}
