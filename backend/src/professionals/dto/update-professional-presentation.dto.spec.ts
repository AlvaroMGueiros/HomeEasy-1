import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProfessionalPresentationDto } from './update-professional-presentation.dto';

describe('Professional presentation validation', () => {
  const mediaId = 'dc15a087-68aa-4ecb-8944-b2d118bd64c8';
  async function errors(payload: object) {
    return validate(plainToInstance(UpdateProfessionalPresentationDto, payload));
  }
  it('accepts a cover and offered-service photo', async () => {
    expect(
      await errors({
        coverPhotoMediaId: mediaId,
        portfolioPhotos: [{ mediaId, kind: 'offered', caption: 'Instalação concluída' }]
      })
    ).toHaveLength(0);
  });
  it('accepts clearing cover and portfolio without changing bio', async () => {
    expect(await errors({ coverPhotoMediaId: null, portfolioPhotos: [] })).toHaveLength(0);
  });
  it('rejects null biography and portfolio', async () => {
    expect((await errors({ bio: null, portfolioPhotos: null })).length).toBeGreaterThan(0);
  });
  it('rejects duplicate media IDs', async () => {
    const photo = { mediaId, kind: 'offered', caption: '' };
    expect((await errors({ portfolioPhotos: [photo, photo] })).length).toBeGreaterThan(0);
  });
  it('rejects invalid photo kinds and IDs', async () => {
    expect(
      (await errors({ portfolioPhotos: [{ mediaId: 'invalid', kind: 'invalid', caption: '' }] })).length
    ).toBeGreaterThan(0);
  });
  it('rejects excessively long captions and a short bio', async () => {
    expect(
      (
        await errors({
          bio: 'curta',
          portfolioPhotos: [{ mediaId, kind: 'offered', caption: 'x'.repeat(201) }]
        })
      ).length
    ).toBeGreaterThan(0);
  });
});
