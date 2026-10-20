import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { ProfessionalProfile } from '../professionals/professional-profile.entity';
import { AvailabilityException } from './availability-exception.entity';
import { AvailabilityPeriod } from './availability-period.entity';
import { ReplaceScheduleDto } from './dto/replace-schedule.dto';
import { validateSchedule } from './schedule.utils';
import { FindAvailabilityQueryDto } from './dto/find-availability-query.dto';
import { professionalAvailabilitySql, resolveAvailabilityParameters } from './availability.utils';

@Injectable()
export class SchedulesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(AvailabilityPeriod)
    private readonly periodsRepository: Repository<AvailabilityPeriod>,
    @InjectRepository(AvailabilityException)
    private readonly exceptionsRepository: Repository<AvailabilityException>,
    @InjectRepository(ProfessionalProfile)
    private readonly profilesRepository: Repository<ProfessionalProfile>
  ) {}

  async findAvailability(professionalId: string, query: FindAvailabilityQueryDto) {
    const parameters = resolveAvailabilityParameters(query.availableAt, query.durationMinutes);
    const profileExists = await this.profilesRepository.exists({ where: { userId: professionalId } });
    if (!profileExists) throw new NotFoundException('Perfil profissional não encontrado.');
    const isAvailable = await this.profilesRepository.createQueryBuilder('profile')
      .where('profile.userId = :professionalId AND profile.isAvailable = true', { professionalId })
      .andWhere(professionalAvailabilitySql, parameters).getExists();
    return { isAvailable, availableAt: parameters.availableAt, durationMinutes: query.durationMinutes, timeZone: 'America/Sao_Paulo' };
  }

  async findByProfessional(professionalId: string) {
    const profileExists = await this.profilesRepository.exists({ where: { userId: professionalId } });
    if (!profileExists) {
      throw new NotFoundException('Perfil profissional não encontrado.');
    }

    const [periods, exceptions] = await Promise.all([
      this.periodsRepository.find({ where: { professionalId }, order: { weekday: 'ASC', startTime: 'ASC' } }),
      this.exceptionsRepository.find({ where: { professionalId }, order: { date: 'ASC' } })
    ]);
    return { periods, exceptions };
  }

  async replaceOwn(professionalId: string, dto: ReplaceScheduleDto) {
    validateSchedule(dto);
    const profileExists = await this.profilesRepository.exists({ where: { userId: professionalId } });
    if (!profileExists) {
      throw new NotFoundException('Crie o perfil profissional antes de configurar a agenda.');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(AvailabilityPeriod, { professionalId });
      await manager.delete(AvailabilityException, { professionalId });
      if (dto.periods.length) {
        await manager.save(
          AvailabilityPeriod,
          dto.periods.map((period) => manager.create(AvailabilityPeriod, { professionalId, ...period }))
        );
      }
      if (dto.exceptions.length) {
        await manager.save(
          AvailabilityException,
          dto.exceptions.map((exception) =>
            manager.create(AvailabilityException, {
              professionalId,
              date: exception.date,
              isUnavailable: exception.isUnavailable,
              startTime: exception.startTime || null,
              endTime: exception.endTime || null
            })
          )
        );
      }
    });

    return this.findByProfessional(professionalId);
  }
}
