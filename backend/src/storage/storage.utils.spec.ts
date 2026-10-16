import { BadRequestException } from '@nestjs/common';

import { MediaPurpose } from './media-purpose.enum';
import { sanitizeFileName, validateMediaContent, validateMediaType } from './storage.utils';

describe('storage rules', () => {
  it('rejects spoofed MIME types and accepts supported file signatures', () => {
    expect(() => validateMediaContent('image/jpeg', Buffer.from('<script>alert(1)'))).toThrow(
      BadRequestException
    );
    expect(() =>
      validateMediaContent('image/png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ).not.toThrow();
    expect(() => validateMediaContent('image/jpeg', Buffer.from([255, 216, 255]))).not.toThrow();
    expect(() => validateMediaContent('image/webp', Buffer.from('RIFF0000WEBP'))).not.toThrow();
    expect(() => validateMediaContent('application/pdf', Buffer.from('%PDF-1.7'))).not.toThrow();
    expect(() => validateMediaContent('image/png', Buffer.alloc(0))).toThrow(BadRequestException);
  });
  it('allows PDF only for private verification documents', () => {
    expect(() => validateMediaType(MediaPurpose.VerificationDocument, 'application/pdf')).not.toThrow();
    expect(() => validateMediaType(MediaPurpose.ChatAttachment, 'application/pdf')).toThrow(
      BadRequestException
    );
  });

  it('removes unsafe characters from an object file name', () => {
    expect(sanitizeFileName('../../Comprovante de residência.png')).toBe(
      '..-..-Comprovante-de-residencia.png'
    );
  });
});
