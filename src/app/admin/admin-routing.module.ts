import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AdminGuard } from '../guardas/admin-guard.guard';
import { AdminVerificationComponent } from './admin-verification.component';
import { AdminCasesComponent } from './cases/admin-cases.component';

const adminRoutes: Routes = [
  { path: 'admin/casos', component: AdminCasesComponent, canActivate: [AdminGuard] },
  { path: 'admin/verificacoes', component: AdminVerificationComponent, canActivate: [AdminGuard] }
];

@NgModule({ imports: [RouterModule.forChild(adminRoutes)], exports: [RouterModule] })
export class AdminRoutingModule { }
