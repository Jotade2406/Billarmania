import { Controller, Post, Get, Put, Delete, Body, Param, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  me(@Request() req) {
    return this.auth.getMe(req.user.sub);
  }

  @Put('profile')
  updateProfile(@Request() req, @Body() body: { name?: string; phone?: string; avatarUrl?: string }) {
    return this.auth.updateProfile(req.user.sub, body);
  }

  @Roles('SUPER_ADMIN')
  @Get('clients')
  getClients() {
    return this.auth.getClients();
  }

  @Roles('DUENO', 'SUPER_ADMIN')
  @Post('staff')
  createStaff(@Body() dto: CreateStaffDto) {
    return this.auth.createStaff(dto);
  }

  @Roles('DUENO', 'SUPER_ADMIN')
  @Delete('staff/:id')
  deleteStaff(@Param('id') id: string) {
    return this.auth.deleteStaff(id);
  }

  @Roles('SUPER_ADMIN')
  @Delete('users/:id')
  deleteUser(@Param('id') id: string, @Request() req) {
    return this.auth.deleteUser(id, req.user.sub);
  }
}
