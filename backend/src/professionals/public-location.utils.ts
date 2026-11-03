import { ProfessionalProfile } from './professional-profile.entity';

// Publish only the center of a fixed cell of roughly five kilometres.
export function toApproximatePublicLocation(location: ProfessionalProfile['location'] | undefined) {
  if (!location) return null;
  const [longitude, latitude] = location.coordinates;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  const cellSize = 0.05;
  return {
    latitude: Number(((Math.floor(latitude / cellSize) + 0.5) * cellSize).toFixed(3)),
    longitude: Number(((Math.floor(longitude / cellSize) + 0.5) * cellSize).toFixed(3))
  };
}
