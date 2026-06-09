import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { UpdateBranchDto } from './dto/branch.dto';
import { CreatePaymentMethodDto } from './dto/payment-method.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('branches')
export class BranchesController {
  constructor(private branches: BranchesService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.branches.findOne(id);
  }

  @Get(':id/payment-methods')
  findPaymentMethods(@Param('id') id: string) {
    return this.branches.findPaymentMethods(id);
  }

  @Get(':id/tables')
  findTables(@Param('id') id: string) {
    return this.branches.findTables(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DUENO', 'SUPER_ADMIN')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branches.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DUENO', 'SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.branches.remove(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DUENO', 'SUPER_ADMIN')
  @Post(':id/payment-methods')
  createPaymentMethod(@Param('id') id: string, @Body() dto: CreatePaymentMethodDto) {
    return this.branches.createPaymentMethod(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DUENO', 'SUPER_ADMIN')
  @Delete(':id/payment-methods/:pmId')
  removePaymentMethod(@Param('pmId') pmId: string) {
    return this.branches.removePaymentMethod(pmId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DUENO', 'SUPER_ADMIN', 'CAJERO')
  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.branches.getStats(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DUENO', 'SUPER_ADMIN')
  @Get(':id/reservations/all')
  findAllReservations(@Param('id') id: string, @Query('status') status?: string) {
    return this.branches.findAllReservations(id, status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DUENO', 'SUPER_ADMIN')
  @Get(':id/staff')
  findStaff(@Param('id') id: string) {
    return this.branches.findStaff(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DUENO', 'SUPER_ADMIN')
  @Get('staff/all')
  findAllStaff() {
    return this.branches.findAllStaff();
  }
}
