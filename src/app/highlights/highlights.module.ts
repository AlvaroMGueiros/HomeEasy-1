import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { AuthGuardGuard } from '../guardas/auth-guard.guard';
import { AdminGuard } from '../guardas/admin-guard.guard';
import { HighlightsComponent } from './highlights.component';
import { CreateHighlightComponent } from './create/create-highlight.component';
import { OwnHighlightsComponent } from './own/own-highlights.component';
import { HighlightsModerationComponent } from './moderation/highlights-moderation.component';

@NgModule({
  imports: [CommonModule, FormsModule, SharedModule, RouterModule.forChild([
    { path: 'destaques', component: HighlightsComponent, canActivate: [AuthGuardGuard] },
    { path: 'destaques/publicar', component: CreateHighlightComponent, canActivate: [AuthGuardGuard] },
    { path: 'destaques/minhas', component: OwnHighlightsComponent, canActivate: [AuthGuardGuard] },
    { path: 'admin/publicacoes', component: HighlightsModerationComponent, canActivate: [AdminGuard] }
  ])],
  declarations: [HighlightsComponent, CreateHighlightComponent, OwnHighlightsComponent, HighlightsModerationComponent]
})
export class HighlightsModule {}
