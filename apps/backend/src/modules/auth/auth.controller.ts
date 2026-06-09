import { Controller, Post, Get, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req) {
    return this.auth.getMe(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DUENO', 'SUPER_ADMIN')
  @Post('staff')
  createStaff(@Body() dto: CreateStaffDto) {
    return this.auth.createStaff(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DUENO', 'SUPER_ADMIN')
  @Delete('staff/:id')
  deleteStaff(@Param('id') id: string) {
    return this.auth.deleteStaff(id);
  }
}
