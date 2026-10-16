import { BadRequestException } from '@nestjs/common';

import { MediaPurpose } from './media-purpose.enum';

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedDocumentTypes = new Set([...allowedImageTypes, 'application/pdf']);

export function validateMediaType(purpose: MediaPurpose, contentType: string) {
  const allowedTypes =
    purpose === MediaPurpose.VerificationDocument ? allowedDocumentTypes : allowedImageTypes;
  if (!allowedTypes.has(contentType.toLowerCase())) {
    throw new BadRequestException('O formato do arquivo não é permitido para esta finalidade.');
  }
}

export function validateMediaContent(contentType: string, header: Buffer) {
  const signatures: Record<string, boolean> = {
    'image/jpeg': header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff,
    'image/png': header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    'image/webp':
      header.subarray(0, 4).toString('ascii') === 'RIFF' &&
      header.subarray(8, 12).toString('ascii') === 'WEBP',
    'application/pdf': header.subarray(0, 5).toString('ascii') === '%PDF-'
  };
  if (!signatures[contentType.toLowerCase()]) {
    throw new BadRequestException('O conteúdo do arquivo não corresponde ao formato autorizado.');
  }
}

export function sanitizeFileName(fileName: string) {
  const sanitized = fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);
  return sanitized || 'arquivo';
}
