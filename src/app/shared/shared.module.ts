import { PageIconComponent } from './page-icon/page-icon.component';
import { CommonModule } from '@angular/common';
import { CharacterCountComponent } from './character-count/character-count.component';
import { ArrowIconComponent } from './arrow-icon/arrow-icon.component';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProfessionalPresentationComponent } from './professional-presentation/professional-presentation.component';
import { CommunityRulesGateComponent } from './community-rules-gate/community-rules-gate.component';
import { UserSafetyActionsComponent } from './user-safety-actions/user-safety-actions.component';
import { AvailabilityCalendarComponent } from './availability-calendar/availability-calendar.component';
import { SiteFooterComponent } from './site-footer/site-footer.component';
import { RoleChoiceModalComponent } from './role-choice-modal/role-choice-modal.component';
import { SelectMenuComponent } from './select-menu/select-menu.component';

import { NavbarComponent } from './navbar/navbar.component';
import { ServiceIconComponent } from './service-icon/service-icon.component';
import { ActionFeedbackComponent } from './action-feedback/action-feedback.component';
import { LoadingStateComponent } from './loading-state/loading-state.component';
import { BackLinkComponent } from './back-link/back-link.component';
import { DialogComponent } from './dialog/dialog.component';
import { RequestAttachmentGalleryComponent } from './request-attachment-gallery/request-attachment-gallery.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  declarations: [PageIconComponent, CharacterCountComponent, ArrowIconComponent, NavbarComponent, ServiceIconComponent, ActionFeedbackComponent, LoadingStateComponent, BackLinkComponent, DialogComponent, RequestAttachmentGalleryComponent, ProfessionalPresentationComponent, CommunityRulesGateComponent, UserSafetyActionsComponent, AvailabilityCalendarComponent, SiteFooterComponent, RoleChoiceModalComponent, SelectMenuComponent],
  exports: [PageIconComponent, CharacterCountComponent, ArrowIconComponent, NavbarComponent, ServiceIconComponent, ActionFeedbackComponent, LoadingStateComponent, BackLinkComponent, DialogComponent, RequestAttachmentGalleryComponent, ProfessionalPresentationComponent, CommunityRulesGateComponent, UserSafetyActionsComponent, AvailabilityCalendarComponent, SiteFooterComponent, RoleChoiceModalComponent, SelectMenuComponent]
})
export class SharedModule {}
