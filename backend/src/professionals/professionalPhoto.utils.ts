import { BadRequestException } from '@nestjs/common';

import { ProfessionalPhoto, ProfessionalPhotoKind } from './professionalPhoto';

export function validatePortfolioPhotoChanges(
  currentPhotos: ProfessionalPhoto[],
  proposedPhotos: ProfessionalPhoto[]
) {
  const existingPhotos = new Map(currentPhotos.map((photo) => [photo.mediaId, photo]));
  for (const photo of proposedPhotos) {
    const existingPhoto = existingPhotos.get(photo.mediaId);
    if (photo.kind === ProfessionalPhotoKind.Completed) {
      if (
        !existingPhoto ||
        existingPhoto.kind !== ProfessionalPhotoKind.Completed ||
        existingPhoto.orderId !== photo.orderId ||
        existingPhoto.caption !== photo.caption.trim()
      ) {
        throw new BadRequestException(
          'Fotos de serviços concluídos devem ser publicadas na página do pedido após a conclusão.'
        );
      }
    } else if (photo.orderId !== undefined || existingPhoto?.kind === ProfessionalPhotoKind.Completed) {
      throw new BadRequestException(
        'Fotos vinculadas a pedidos concluídos não podem ser convertidas em exemplos de serviços oferecidos.'
      );
    }
  }
}
