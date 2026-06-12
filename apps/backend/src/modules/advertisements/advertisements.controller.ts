import { Controller, Get, Post, Put, Delete, Patch, Param, Body } from '@nestjs/common';
import { AdvertisementsService } from './advertisements.service';
import { CreateAdvertisementDto, UpdateAdvertisementDto } from './dto/advertisement.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('advertisements')
export class AdvertisementsController {
  constructor(private ads: AdvertisementsService) {}

  // App cliente: anuncios vigentes de todas las sucursales (home)
  @Get('active')
  findActiveGlobal() {
    return this.ads.findActiveGlobal();
  }

  // App cliente: anuncios vigentes de una sucursal
  @Get('branch/:branchId')
  findActive(@Param('branchId') branchId: string) {
    return this.ads.findActive(branchId);
  }

  // Panel dueño
  @Roles('DUENO', 'SUPER_ADMIN')
  @Get('manage/:branchId')
  findAll(@Param('branchId') branchId: string) {
    return this.ads.findAll(branchId);
  }

  @Roles('DUENO', 'SUPER_ADMIN')
  @Post('branch/:branchId')
  create(@Param('branchId') branchId: string, @Body() dto: CreateAdvertisementDto) {
    return this.ads.create(branchId, dto);
  }

  @Roles('DUENO', 'SUPER_ADMIN')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAdvertisementDto) {
    return this.ads.update(id, dto);
  }

  @Roles('DUENO', 'SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ads.remove(id);
  }

  @Roles('DUENO', 'SUPER_ADMIN')
  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.ads.toggle(id);
  }

  // Métrica de vistas (la app la llama al mostrar el anuncio)
  @Post(':id/view')
  registerView(@Param('id') id: string) {
    return this.ads.registerView(id);
  }
}
