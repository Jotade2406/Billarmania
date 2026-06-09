import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ChainsService } from './chains.service';
import { CreateChainDto, UpdateChainDto } from './dto/chain.dto';
import { CreateBranchDto } from '../branches/dto/branch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('chains')
export class ChainsController {
  constructor(private chains: ChainsService) {}

  @Get()
  findAll() {
    return this.chains.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  findMine(@Request() req) {
    return this.chains.findByOwner(req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.chains.findOne(id);
  }

  @Get(':chainId/branches')
  findBranches(@Param('chainId') chainId: string) {
    return this.chains.findBranches(chainId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DUENO', 'SUPER_ADMIN')
  @Post(':chainId/branches')
  createBranch(@Param('chainId') chainId: string, @Body() dto: CreateBranchDto) {
    return this.chains.createBranch(chainId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DUENO', 'SUPER_ADMIN')
  @Post()
  create(@Request() req, @Body() dto: CreateChainDto) {
    return this.chains.create(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DUENO', 'SUPER_ADMIN')
  @Put(':id')
  update(@Param('id') id: string, @Request() req, @Body() dto: UpdateChainDto) {
    return this.chains.update(id, req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DUENO', 'SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.chains.remove(id, req.user.sub);
  }
}
