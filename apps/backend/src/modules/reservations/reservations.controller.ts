import { Controller, Post, Get, Param, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller()
export class ReservationsController {
  constructor(private reservations: ReservationsService) {}

  @Post('reservations')
  create(@Request() req, @Body() dto: CreateReservationDto) {
    return this.reservations.create(req.user.sub, dto);
  }

  @Post('reservations/:id/proof')
  uploadProof(
    @Param('id') id: string,
    @Request() req,
    @Body('proofUrl') proofUrl: string,
  ) {
    return this.reservations.uploadProof(id, req.user.sub, proofUrl);
  }

  @Post('reservations/:id/confirm')
  confirm(@Param('id') id: string, @Request() req) {
    return this.reservations.confirm(id, req.user.sub);
  }

  @Post('reservations/:id/reject')
  reject(@Param('id') id: string, @Request() req) {
    return this.reservations.reject(id, req.user.sub);
  }

  @Post('reservations/:id/check-in')
  checkIn(@Param('id') id: string) {
    return this.reservations.checkIn(id);
  }

  @Post('reservations/:id/cancel')
  cancel(@Param('id') id: string, @Request() req) {
    return this.reservations.cancel(id, req.user.sub);
  }

  @Get('me/reservations')
  myReservations(@Request() req) {
    return this.reservations.findMyReservations(req.user.sub);
  }

  @Get('reservations/:id')
  findOne(@Param('id') id: string) {
    return this.reservations.findOne(id);
  }

  @Get('branches/:branchId/reservations')
  pendingForBranch(@Param('branchId') branchId: string) {
    return this.reservations.findPendingForBranch(branchId);
  }
}
