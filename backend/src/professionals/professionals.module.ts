import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminGuard } from '../auth/admin.guard';
import { ProfessionalHighlight } from './professional-highlight.entity';
import { HighlightsController } from './highlights.controller';
import { HighlightsService } from './highlights.service';
import { StorageModule } from '../storage/storage.module';
import { Service } from '../services/service.entity';
import { ProfessionalProfile } from './professional-profile.entity';
import { ProfessionalService } from './professional-service.entity';
import { ProfessionalsController } from './professionals.controller';
import { ProfessionalsService } from './professionals.service';

@Module({
  imports: [StorageModule, TypeOrmModule.forFeature([ProfessionalProfile, ProfessionalService, Service, ProfessionalHighlight])],
  controllers: [ProfessionalsController, HighlightsController],
  providers: [ProfessionalsService, HighlightsService, AdminGuard],
  exports: [ProfessionalsService]
})
export class ProfessionalsModule {}
