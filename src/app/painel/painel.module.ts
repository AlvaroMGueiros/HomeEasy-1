import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../shared/shared.module';
import { AuthGuardGuard } from '../guardas/auth-guard.guard';
import { ProviderGuard } from '../guardas/provider.guard';
import { VisaoGeralComponent } from './visao-geral/visao-geral.component';

const painelRoutes: Routes = [
  { path: 'inicio', component: VisaoGeralComponent, canActivate: [AuthGuardGuard, ProviderGuard] }
];

@NgModule({
  imports: [CommonModule, SharedModule, RouterModule.forChild(painelRoutes)],
  declarations: [VisaoGeralComponent]
})
export class PainelModule {}
