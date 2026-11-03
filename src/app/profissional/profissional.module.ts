import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from '@angular/forms';

import { ProfissionalComponent } from './profissional.component';
import { AddprofissioanlComponent } from './addprofissioanl/addprofissioanl.component';
import { EditarInfoComponent } from './editar-info/editar-info.component';
import { ProfissionalRoutingModule } from './profissional.routing.module';
import { SharedModule } from '../shared/shared.module';
import { ScheduleComponent } from './schedule/schedule.component';
import { ProfessionalDashboardComponent } from './dashboard/professional-dashboard.component';
import { VerificationComponent } from './verification/verification.component';

@NgModule({
    imports:[
        CommonModule,
        FormsModule,
        ProfissionalRoutingModule,
        SharedModule
    ],
    declarations:[
        ScheduleComponent,
        ProfessionalDashboardComponent,
        VerificationComponent,
        ProfissionalComponent,
        AddprofissioanlComponent,
        EditarInfoComponent
    ], 
    exports:[],
    providers:[]
})

export class ProfissionalModule {}
