import { validatePortfolioPhotoChanges } from './professionalPhoto.utils';
import { ProfessionalPhoto, ProfessionalPhotoKind } from './professionalPhoto';

describe('Portfolio photo rules', () => {
  const completedPhoto: ProfessionalPhoto = {
    mediaId: 'photo',
    kind: ProfessionalPhotoKind.Completed,
    caption: 'Resultado',
    orderId: 'order'
  };
  it('rejects creating completed-service photos in profile editing', () => {
    expect(() => validatePortfolioPhotoChanges([], [completedPhoto])).toThrow('página do pedido');
  });
  it('preserves completed-service photos while adding offered-service examples', () => {
    expect(() =>
      validatePortfolioPhotoChanges(
        [completedPhoto],
        [completedPhoto, { mediaId: 'example', kind: ProfessionalPhotoKind.Offered, caption: '' }]
      )
    ).not.toThrow();
  });
  it('allows removing a completed-service photo from the public portfolio', () => {
    expect(() => validatePortfolioPhotoChanges([completedPhoto], [])).not.toThrow();
  });
  it('rejects changing a completed photo order', () => {
    expect(() =>
      validatePortfolioPhotoChanges([completedPhoto], [{ ...completedPhoto, orderId: 'anotherOrder' }])
    ).toThrow();
  });
  it('rejects converting a completed photo into an offered service', () => {
    expect(() =>
      validatePortfolioPhotoChanges(
        [completedPhoto],
        [{ ...completedPhoto, kind: ProfessionalPhotoKind.Offered, orderId: undefined }]
      )
    ).toThrow();
  });
  it('rejects attaching an order to an offered-service photo', () => {
    expect(() =>
      validatePortfolioPhotoChanges([], [{ ...completedPhoto, kind: ProfessionalPhotoKind.Offered }])
    ).toThrow();
  });
});
