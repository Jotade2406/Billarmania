import { Controller, Get, Param } from '@nestjs/common';
import { BranchesService } from './branches.service';

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
}
