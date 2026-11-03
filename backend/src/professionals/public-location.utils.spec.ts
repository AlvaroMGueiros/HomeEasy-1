import { toApproximatePublicLocation } from './public-location.utils';

describe('approximate public location', () => {
  it('returns the same cell for nearby private coordinates', () => {
    const first = toApproximatePublicLocation({ type: 'Point', coordinates: [-34.901, -8.101] });
    const second = toApproximatePublicLocation({ type: 'Point', coordinates: [-34.902, -8.102] });
    expect(first).toEqual(second);
    expect(first).toEqual({ latitude: -8.125, longitude: -34.925 });
  });
  it('does not invent coordinates when location is missing', () => {
    expect(toApproximatePublicLocation(undefined)).toBeNull();
  });
});
