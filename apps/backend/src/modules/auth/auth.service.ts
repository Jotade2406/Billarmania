import { Injectable, ConflictException, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CreateStaffDto } from './dto/create-staff.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('El email ya está registrado');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, name: dto.name, phone: dto.phone, passwordHash },
    });

    return this.signToken(user.id, user.email, user.role, user.name, user.phone);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Credenciales incorrectas');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales incorrectas');

    return this.signToken(user.id, user.email, user.role, user.name, user.phone, user.avatarUrl);
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, phone: true, role: true, staffBranchId: true, avatarUrl: true },
    });
  }

  async updateProfile(userId: string, dto: { name?: string; phone?: string; avatarUrl?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { ...dto },
      select: { id: true, email: true, name: true, phone: true, role: true, avatarUrl: true },
    });
  }

  async getClients() {
    return this.prisma.user.findMany({
      where: { role: 'CLIENTE' },
      select: { id: true, email: true, name: true, phone: true, avatarUrl: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStaff(dto: CreateStaffDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('El email ya está registrado');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        phone: dto.phone,
        passwordHash,
        role: dto.role,
        staffBranchId: dto.staffBranchId,
      },
      select: { id: true, email: true, name: true, role: true, staffBranchId: true, createdAt: true },
    });
  }

  async deleteStaff(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Nullify payment reviews made by this user
      await tx.payment.updateMany({
        where: { reviewedById: userId },
        data: { reviewedById: null },
      });

      // Reassign chains owned by this user to any SUPER_ADMIN
      const admin = await tx.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
      if (admin) {
        await tx.chain.updateMany({
          where: { ownerId: userId },
          data: { ownerId: admin.id },
        });
      }

      return tx.user.delete({ where: { id: userId } });
    }, { timeout: 30000, maxWait: 10000 });
  }

  /**
   * Eliminación total de un usuario (solo SUPER_ADMIN). Limpia o reasigna
   * todas sus referencias: reseñas de pagos, cadenas, ventas, facturas
   * anuladas, reservas y pagos del cliente.
   */
  async deleteUser(userId: string, adminId: string) {
    if (userId === adminId) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    return this.prisma.$transaction(async (tx) => {
      // Referencias como staff/revisor
      await tx.payment.updateMany({
        where: { reviewedById: userId },
        data: { reviewedById: null },
      });
      await tx.invoice.updateMany({
        where: { voidedById: userId },
        data: { voidedById: null },
      });
      await tx.chain.updateMany({
        where: { ownerId: userId },
        data: { ownerId: adminId },
      });
      await tx.sale.updateMany({
        where: { cashierId: userId },
        data: { cashierId: adminId },
      });

      // Reservas y pagos del usuario como cliente
      await tx.payment.deleteMany({
        where: { reservation: { userId } },
      });
      await tx.reservation.deleteMany({ where: { userId } });

      return tx.user.delete({
        where: { id: userId },
        select: { id: true, email: true, name: true, role: true },
      });
    }, { timeout: 30000, maxWait: 10000 });
  }

  private signToken(
    userId: string,
    email: string,
    role: string,
    name?: string,
    phone?: string | null,
    avatarUrl?: string | null,
  ) {
    const token = this.jwt.sign({ sub: userId, email, role });
    return {
      access_token: token,
      user: {
        id: userId,
        email,
        role,
        name: name ?? '',
        phone: phone ?? undefined,
        avatarUrl: avatarUrl ?? undefined,
      },
    };
  }
}
