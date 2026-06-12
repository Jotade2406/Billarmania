import { Controller, Get, Post, Put, Patch, Delete, Param, Body } from '@nestjs/common';
import { TableStatus } from '@prisma/client';
import { TablesService } from './tables.service';
import { CreateTableDto, UpdateTableDto } from './dto/table.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('tables')
export class TablesController {
  constructor(private tables: TablesService) {}

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: TableStatus) {
    return this.tables.updateStatus(id, status);
  }

  @Roles('CAJERO', 'DUENO', 'SUPER_ADMIN')
  @Get(':id/session')
  getSession(@Param('id') id: string) {
    return this.tables.getSession(id);
  }

  @Roles('DUENO', 'SUPER_ADMIN', 'CAJERO')
  @Post('branch/:branchId')
  create(@Param('branchId') branchId: string, @Body() dto: CreateTableDto) {
    return this.tables.create(branchId, dto);
  }

  @Roles('DUENO', 'SUPER_ADMIN')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTableDto) {
    return this.tables.update(id, dto);
  }

  @Roles('DUENO', 'SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tables.remove(id);
  }
}
