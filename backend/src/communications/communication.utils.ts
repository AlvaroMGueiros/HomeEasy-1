import { BadRequestException } from '@nestjs/common';

import { OrderStatus } from '../marketplace/marketplace.enums';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageType } from './communication.enums';

export function validateMessage(message: SendMessageDto) {
  if (message.type === MessageType.Text && !message.content?.trim()) {
    throw new BadRequestException('Escreva uma mensagem antes de enviar.');
  }
  if (message.type === MessageType.Budget && message.budgetAmount === undefined) {
    throw new BadRequestException('Informe o valor do orçamento.');
  }
  if (message.type === MessageType.Image && !message.mediaId) {
    throw new BadRequestException('Envie e conclua a imagem antes de anexá-la à conversa.');
  }
}

export function resolveMessageNotificationBody(message: SendMessageDto) {
  if (message.type === MessageType.Image) return '📷 Enviou uma foto';
  if (message.type === MessageType.Budget) return 'Enviou um orçamento';
  const preview = message.content?.trim().replace(/\s+/g, ' ') || 'Enviou uma mensagem';
  if (preview.length <= 180) return preview;
  return `${preview.slice(0, 177)}...`;
}

export function isConversationWritable(orderStatus: OrderStatus) {
  return ![
    OrderStatus.Completed,
    OrderStatus.CancelledByClient,
    OrderStatus.CancelledByProfessional
  ].includes(orderStatus);
}
