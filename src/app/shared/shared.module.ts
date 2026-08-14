import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { NavbarComponent } from './navbar/navbar.component';
import { ServiceIconComponent } from './service-icon/service-icon.component';
import { ActionFeedbackComponent } from './action-feedback/action-feedback.component';
import { LoadingStateComponent } from './loading-state/loading-state.component';
import { BackLinkComponent } from './back-link/back-link.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule
  ],
  declarations: [NavbarComponent, ServiceIconComponent, ActionFeedbackComponent, LoadingStateComponent, BackLinkComponent],
  exports: [NavbarComponent, ServiceIconComponent, ActionFeedbackComponent, LoadingStateComponent, BackLinkComponent]
})
export class SharedModule {}
