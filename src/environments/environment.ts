// This file can be replaced during build by using the `fileReplacements` array.
// `ng build ---prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  geocodingApiUrl: 'https://nominatim.openstreetmap.org/search',
  ibgeLocationsApiUrl: 'https://servicodados.ibge.gov.br/api/v1/localidades',
  firebase: {
    apiKey: "AIzaSyCYyutJVjVj9HxXm385h6Jtcc1rkuQ5GYg",
    authDomain: "homeeasy-52792.firebaseapp.com",
    databaseURL: "https://homeeasy-52792.firebaseio.com",
    projectId: "homeeasy-52792",
    storageBucket: "homeeasy-52792.appspot.com",
    messagingSenderId: "80905431352",
    appId: "1:80905431352:web:198adf80e4cb1a681179cd",
    measurementId: "G-M13ZZ6YYV5"
  }
};

/*
 * In development mode, to ignore zone related error stack frames such as
 * `zone.run`, `zoneDelegate.invokeTask` for easier debugging, you can
 * import the following file, but please comment it out in production mode
 * because it will have performance impact when throw error
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
