// This file can be replaced during build by using the `fileReplacements` array.
// `ng build ---prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  googleWebClientId: '636779212416-1hck1h1n3r4taskcarjlv3ss9pr17ai3.apps.googleusercontent.com',
  apiUrl: 'http://localhost:3000/api',
  geocodingApiUrl: 'https://nominatim.openstreetmap.org/search',
  ibgeLocationsApiUrl: 'https://servicodados.ibge.gov.br/api/v1/localidades'
};

/*
 * In development mode, to ignore zone related error stack frames such as
 * `zone.run`, `zoneDelegate.invokeTask` for easier debugging, you can
 * import the following file, but please comment it out in production mode
 * because it will have performance impact when throw error
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
