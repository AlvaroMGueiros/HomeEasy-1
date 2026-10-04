export enum ProfessionalPhotoKind {
  Completed = 'completed',
  Offered = 'offered'
}
export interface ProfessionalPhoto {
  mediaId: string;
  kind: ProfessionalPhotoKind;
  caption: string;
  orderId?: string;
}
