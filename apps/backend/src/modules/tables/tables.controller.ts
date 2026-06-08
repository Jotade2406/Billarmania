import { Controller, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { TableStatus } from '@prisma/client';
import { TablesService } from './tables.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('tables')
export class TablesController {
  constructor(private tables: TablesService) {}

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: TableStatus) {
    return this.tables.updateStatus(id, status);
  }
}
