import { Controller, Get, Post, Put, Delete, Param, Body, Query, Request } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
import { CreatePaymentMethodDto } from './dto/payment-method.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('branches')
export class BranchesController {
  constructor(private branches: BranchesService) {}

  // static routes BEFORE :id param routes
  @Roles('SUPER_ADMIN')
  @Get()
  findAll() {
    return this.branches.findAll();
  }

  @Roles('SUPER_ADMIN')
  @Post()
  create(@Request() req, @Body() dto: CreateBranchDto) {
    return this.branches.createDirect(req.user.sub, dto);
  }

  @Roles('DUENO', 'SUPER_ADMIN')
  @Get('staff/all')
  findAllStaff() {
    return this.branches.findAllStaff();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.branches.findOne(id);
  }

  @Public()
  @Get(':id/payment-methods')
  findPaymentMethods(@Param('id') id: string) {
    return this.branches.findPaymentMethods(id);
  }

  @Public()
  @Get(':id/tables')
  findTables(@Param('id') id: string) {
    return this.branches.findTables(id);
  }

  @Roles('DUENO', 'SUPER_ADMIN')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branches.update(id, dto);
  }

  @Roles('SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.branches.remove(id);
  }

  @Roles('DUENO', 'SUPER_ADMIN')
  @Post(':id/payment-methods')
  createPaymentMethod(@Param('id') id: string, @Body() dto: CreatePaymentMethodDto) {
    return this.branches.createPaymentMethod(id, dto);
  }

  @Roles('DUENO', 'SUPER_ADMIN')
  @Delete(':id/payment-methods/:pmId')
  removePaymentMethod(@Param('pmId') pmId: string) {
    return this.branches.removePaymentMethod(pmId);
  }

  @Roles('DUENO', 'SUPER_ADMIN', 'CAJERO')
  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.branches.getStats(id);
  }

  @Roles('DUENO', 'SUPER_ADMIN')
  @Get(':id/reservations/all')
  findAllReservations(@Param('id') id: string, @Query('status') status?: string) {
    return this.branches.findAllReservations(id, status);
  }

  @Roles('DUENO', 'SUPER_ADMIN')
  @Get(':id/staff')
  findStaff(@Param('id') id: string) {
    return this.branches.findStaff(id);
  }
}
