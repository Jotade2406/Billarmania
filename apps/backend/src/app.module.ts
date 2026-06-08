import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChainsModule } from './modules/chains/chains.module';
import { BranchesModule } from './modules/branches/branches.module';
import { TablesModule } from './modules/tables/tables.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { RealtimeModule } from './realtime/realtime.module';
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
  ],
})
export class AppModule {}
