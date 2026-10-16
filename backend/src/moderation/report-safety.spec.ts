import 'reflect-metadata';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { MarketplaceService } from '../marketplace/marketplace.service';
import { Order } from '../marketplace/order.entity';
import { Conversation } from '../communications/conversation.entity';
import { ProfessionalProfile } from '../professionals/professional-profile.entity';
import { StorageService } from '../storage/storage.service';
import { Dispute } from './dispute.entity';
import { ModerationService } from './moderation.service';
import { ModerationStatus, ReportCategory } from './moderation.enums';
import { Report } from './report.entity';
import { VerificationDocument } from './verification-document.entity';

describe('Message reports', () => {
  function createService(senderId = 'professional') {
    const reports = {
      create: jest.fn((value: Report) => value),
      save: jest.fn(async (value: Report) => value)
    };
    const datasource = {
      getRepository: jest.fn((entity: unknown) => ({
        findOne: jest.fn(async () =>
          entity === Conversation
            ? { id: 'conversation', clientId: 'client', professionalId: 'professional' }
            : { id: 'message', senderId, content: 'Conteúdo que precisa de análise' }
        )
      }))
    };
    const service = new ModerationService(
      datasource as unknown as DataSource,
      {} as StorageService,
      {} as MarketplaceService,
      {} as Repository<VerificationDocument>,
      reports as unknown as Repository<Report>,
      {} as Repository<Dispute>,
      {} as Repository<Order>,
      {} as Repository<ProfessionalProfile>
    );
    const report = {
      conversationId: 'conversation',
      targetUserId: 'professional',
      messageId: 'message',
      category: ReportCategory.Harassment,
      description: 'Relato com detalhes suficientes para análise.'
    };
    return { service, reports, report };
  }
  it('rejects reports of private conversations by outsiders', async () => {
    const { service, report, reports } = createService();
    await expect(service.createReport('stranger', report)).rejects.toBeInstanceOf(ForbiddenException);
    expect(reports.save).not.toHaveBeenCalled();
  });
  it('rejects own messages and mismatched targets', async () => {
    const { service, report, reports } = createService('client');
    await expect(service.createReport('client', report)).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createReport('client', { ...report, targetUserId: 'stranger' })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(reports.save).not.toHaveBeenCalled();
  });
  it('keeps the report pending and attaches message evidence for moderation', async () => {
    const { service, report } = createService();
    const saved = await service.createReport('client', report);
    expect(saved.status).toBe(ModerationStatus.Pending);
    expect(saved.description).toContain('Conteúdo que precisa de análise');
    expect(saved.description).toContain(report.description);
    expect(saved.conversationId).toBe('conversation');
  });
});
