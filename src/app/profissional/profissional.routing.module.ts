import { NgModule } from "@angular/core";
import { Routes, RouterModule } from '@angular/router';

import { ProfissionalComponent } from './profissional.component';
import { AddprofissioanlComponent } from './addprofissioanl/addprofissioanl.component';
import { EditarInfoComponent } from './editar-info/editar-info.component';
import { AuthGuardGuard } from './../guardas/auth-guard.guard';
import { ProfessionalProfileGuard } from '../guardas/professional-profile.guard';
import { ScheduleComponent } from './schedule/schedule.component';
import { ProfessionalDashboardComponent } from './dashboard/professional-dashboard.component';
import { VerificationComponent } from './verification/verification.component';

const profissionalRoutes : Routes = [
    {path: 'verificacao', component: VerificationComponent, canActivate: [AuthGuardGuard]},
    {path: 'painel-profissional', component: ProfessionalDashboardComponent, canActivate: [AuthGuardGuard]},
    {path: 'agenda', component: ScheduleComponent, canActivate: [AuthGuardGuard]},
    {path : 'profissional', component : ProfissionalComponent},
    {path : 'serprofissional', component : AddprofissioanlComponent, canActivate : [AuthGuardGuard, ProfessionalProfileGuard]},
    {path : 'serviços/:id/detalhe/:idd/editar', component : EditarInfoComponent, canActivate : [AuthGuardGuard]}
];

@NgModule({
    imports:[
        RouterModule.forChild(profissionalRoutes)
    ],
    exports:[
        RouterModule
    ]
})

export class ProfissionalRoutingModule {}
