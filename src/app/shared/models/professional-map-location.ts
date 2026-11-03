export interface PublicLocation {
  latitude: number;
  longitude: number;
}

export interface ProfessionalMapLocation {
  professionalId: string;
  professionalName: string;
  serviceName: string;
  city: string;
  publicLocation?: PublicLocation;
}
