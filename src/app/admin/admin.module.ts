import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AdminCasesComponent } from './cases/admin-cases.component';
import { FormsModule } from '@angular/forms';

import { SharedModule } from '../shared/shared.module';
import { AdminRoutingModule } from './admin-routing.module';
import { AdminVerificationComponent } from './admin-verification.component';

@NgModule({
  imports: [CommonModule, FormsModule, SharedModule, AdminRoutingModule],
  declarations: [AdminVerificationComponent, AdminCasesComponent]
})
export class AdminModule { }
