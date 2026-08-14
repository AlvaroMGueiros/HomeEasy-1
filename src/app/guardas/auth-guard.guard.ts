import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';

import { LoginServiceService } from '../Servicos/login-service.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardGuard implements CanActivate {

  constructor(private afAuth : LoginServiceService, private router : Router){}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) : Promise<boolean>  {
    return new Promise(resolve => {
        this.afAuth.getAuth().onAuthStateChanged(user => {
          if(!user) {
            this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
          }
          
          resolve(user ? true : false);
        })
    });
  }

}
