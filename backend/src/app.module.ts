import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module';
import { CommunicationsModule } from './communications/communications.module';
import { DatabaseModule } from './database/database.module';
import { createDatabaseOptions } from './database/database-options';
import { EngagementModule } from './engagement/engagement.module';
import { HealthModule } from './health/health.module';
import { LegalModule } from './legal/legal.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { ModerationModule } from './moderation/moderation.module';
import { ProfessionalsModule } from './professionals/professionals.module';
import { SchedulesModule } from './schedules/schedules.module';
import { ServicesModule } from './services/services.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';
import { validateEnvironment } from './config/environment.validation';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...createDatabaseOptions((key) => configService.get(key)),
        autoLoadEntities: true,
        synchronize: false
      })
    }),
    DatabaseModule,
    HealthModule,
    LegalModule,
    UsersModule,
    AuthModule,
    ServicesModule,
    ProfessionalsModule,
    SchedulesModule,
    MarketplaceModule,
    EngagementModule,
    CommunicationsModule,
    StorageModule,
    ModerationModule
  ]
})
export class AppModule {}
