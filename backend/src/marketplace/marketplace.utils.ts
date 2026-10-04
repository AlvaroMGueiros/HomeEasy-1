import { BadRequestException } from '@nestjs/common';

import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import {
  ServiceRequestFieldDefinition,
  ServiceRequestFieldType
} from '../services/service-request-field.types';
import { OrderStatus, ServiceRequestStatus } from './marketplace.enums';
import { Order } from './order.entity';
import { ServiceRequest } from './service-request.entity';

export function validateServiceRequest(dto: CreateServiceRequestDto) {
  const hasLatitude = dto.latitude !== undefined;
  const hasLongitude = dto.longitude !== undefined;
  if (hasLatitude !== hasLongitude) {
    throw new BadRequestException('latitude e longitude devem ser informadas juntas.');
  }
  if (
    dto.budgetMinimum !== undefined &&
    dto.budgetMaximum !== undefined &&
    dto.budgetMinimum > dto.budgetMaximum
  ) {
    throw new BadRequestException('O orçamento mínimo não pode ser maior que o máximo.');
  }
  if (dto.preferredAt && new Date(dto.preferredAt) <= new Date()) {
    throw new BadRequestException('A data preferida precisa estar no futuro.');
  }
}

export function validateServiceAnswers(
  requestForm: ServiceRequestFieldDefinition[],
  answers: Record<string, string | number | boolean>
) {
  const allowedKeys = new Set(requestForm.map((field) => field.key));
  for (const key of Object.keys(answers)) {
    if (!allowedKeys.has(key)) {
      throw new BadRequestException(`O campo específico “${key}” não pertence ao serviço selecionado.`);
    }
  }
  for (const field of requestForm) {
    const value = answers[field.key];
    if (field.required && (value === undefined || value === '')) {
      throw new BadRequestException(`Responda ao campo obrigatório “${field.label}”.`);
    }
    if (value === undefined) {
      continue;
    }
    if (field.type === ServiceRequestFieldType.Number) {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue) || (field.minimum !== undefined && numericValue < field.minimum)) {
        throw new BadRequestException(`Informe um valor válido para “${field.label}”.`);
      }
    }
    if (
      field.type === ServiceRequestFieldType.Select &&
      !field.options?.some((option) => option.value === value)
    ) {
      throw new BadRequestException(`Selecione uma opção válida para “${field.label}”.`);
    }
  }
}

export function canServiceRequestReceiveProposal(request: ServiceRequest, now = new Date()) {
  return (
    [ServiceRequestStatus.Requested, ServiceRequestStatus.ProposalReceived].includes(request.status) &&
    request.expiresAt > now &&
    request.proposalCount < request.maximumProposals
  );
}

export function canServiceRequestAcceptProposal(request: ServiceRequest, now = new Date()) {
  return (
    [ServiceRequestStatus.Requested, ServiceRequestStatus.ProposalReceived].includes(request.status) &&
    request.expiresAt > now
  );
}

export function canTransitionOrder(order: Order, actorId: string, nextStatus: OrderStatus) {
  if (nextStatus === OrderStatus.Disputed) {
    return [OrderStatus.Scheduled, OrderStatus.InProgress].includes(order.status);
  }
  if (order.status === OrderStatus.InProgress && nextStatus === OrderStatus.Completed) {
    return actorId === order.clientId || actorId === order.professionalId;
  }
  if (actorId !== order.professionalId) {
    return false;
  }
  if ([OrderStatus.Accepted, OrderStatus.Scheduled].includes(order.status)) {
    return nextStatus === OrderStatus.InProgress;
  }
  return false;
}

export function resolveOrderStatusTimestamps(
  status: OrderStatus,
  timestamp = new Date()
): Partial<Pick<Order, 'scheduleConfirmedAt' | 'startedAt' | 'completedAt'>> {
  switch (status) {
    case OrderStatus.Scheduled:
      return { scheduleConfirmedAt: timestamp };
    case OrderStatus.InProgress:
      return { startedAt: timestamp };
    case OrderStatus.Completed:
      return { completedAt: timestamp };
    default:
      return {};
  }
}
