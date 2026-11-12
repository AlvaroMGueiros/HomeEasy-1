import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { map, take } from 'rxjs/operators';

import { LoginServiceService } from '../Servicos/login-service.service';

@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate {
  constructor(private afAuth : LoginServiceService, private router : Router){}

  canActivate() : Promise<boolean>  {
    return firstValueFrom(this.afAuth.getAuthState().pipe(
      take(1),
      map(user => {
        if (user) {
          void this.router.navigate(['/inicio']);
        }

        return !user;
      })
    ));
  }

}
