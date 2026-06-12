import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChainsModule } from './modules/chains/chains.module';
import { BranchesModule } from './modules/branches/branches.module';
import { TablesModule } from './modules/tables/tables.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { RealtimeModule } from './realtime/realtime.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SalesModule } from './modules/sales/sales.module';
import { AdvertisementsModule } from './modules/advertisements/advertisements.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '../../.env',
    }),
    PrismaModule,
    AuthModule,
    ChainsModule,
    BranchesModule,
    TablesModule,
    ReservationsModule,
    RealtimeModule,
    InventoryModule,
    SalesModule,
    AdvertisementsModule,
    PromotionsModule,
  ],
  providers: [
    // Order matters: JWT runs first, then Roles
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
