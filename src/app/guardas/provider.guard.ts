import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ProviderStatusService } from '../Servicos/provider-status.service';
import { getCurrentUser } from '../shared/utils/session-user.utils';

/** The overview is for service providers; everyone else goes straight to the search. */
@Injectable({ providedIn: 'root' })
export class ProviderGuard implements CanActivate {
  constructor(private providerStatus: ProviderStatusService, private router: Router) {}

  async canActivate(): Promise<boolean | UrlTree> {
    const user = getCurrentUser();
    const isProvider = await firstValueFrom(this.providerStatus.isProvider(user?.id || user?.uid || ''));
    return isProvider ? true : this.router.parseUrl('/feed');
  }
}
