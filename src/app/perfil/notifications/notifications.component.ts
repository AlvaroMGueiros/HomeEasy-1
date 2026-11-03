import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NotificationService, ApiNotification } from '../../Servicos/notification.service';
import { LoginServiceService } from '../../Servicos/login-service.service';
import { getCurrentUser } from '../../shared/utils/session-user.utils';
import { resolveHttpErrorMessage } from '../../shared/utils/http-error.utils';
import { resolveNotificationRoute } from '../../shared/utils/notification-route.utils';

@Component({ standalone: false, selector: 'app-notifications', templateUrl: './notifications.component.html' })
export class NotificationsComponent implements OnInit {
  userId = getCurrentUser()?.id || getCurrentUser()?.uid || '';
  notifications: ApiNotification[] = [];
  isLoading = true; isSaving = false; error = '';
  constructor(private service: NotificationService, private router: Router, private login: LoginServiceService) {}
  ngOnInit() { void this.load(); }
  get hasUnread() { return this.notifications.some(notification => !notification.readAt); }
  async load() {
    this.isLoading = true; this.error = '';
    try { this.notifications = await firstValueFrom(this.service.findNotifications()); }
    catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível carregar as notificações.'); }
    finally { this.isLoading = false; }
  }
  async markAll() {
    if (this.isSaving) return;
    this.isSaving = true; this.error = '';
    try { const response = await firstValueFrom(this.service.markAllRead()); this.notifications = this.notifications.map(notification => ({ ...notification, readAt: notification.readAt || response.readAt })); }
    catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível marcar as notificações como lidas.'); }
    finally { this.isSaving = false; }
  }
  async open(notification: ApiNotification) {
    if (this.isSaving) return;
    this.isSaving = true;
    try { if (!notification.readAt) { await firstValueFrom(this.service.markRead(notification.id)); notification.readAt = new Date().toISOString(); } await this.router.navigateByUrl(resolveNotificationRoute(notification.actionUrl)); }
    catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível abrir a notificação.'); }
    finally { this.isSaving = false; }
  }
  async logout() { await this.login.sair(); await this.router.navigate(['/home']); }
}
