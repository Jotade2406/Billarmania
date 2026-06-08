import { Controller, Get, Param } from '@nestjs/common';
import { ChainsService } from './chains.service';

@Controller('chains')
export class ChainsController {
  constructor(private chains: ChainsService) {}

  @Get()
  findAll() {
    return this.chains.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.chains.findOne(id);
  }

  @Get(':chainId/branches')
  findBranches(@Param('chainId') chainId: string) {
    return this.chains.findBranches(chainId);
  }
}
