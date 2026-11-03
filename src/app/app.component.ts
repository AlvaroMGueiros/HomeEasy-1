import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import { colors } from './shared/colors';
import { NotificationService } from './shared/notification/notification.service';
import { OnlinePresenceService } from './Servicos/online-presence.service';
import { ApiSessionService } from './Servicos/api-session.service';

@Component({
  standalone: false,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'app';

  constructor(
    private router : Router,
    @Inject(DOCUMENT) private document : Document,
    public notificationService: NotificationService,
    private onlinePresenceService: OnlinePresenceService,
    public sessionService: ApiSessionService
  ){

  }
  ngOnInit(){
    const rootStyle = this.document.documentElement.style;
    Object.keys(colors).forEach(colorName => {
      rootStyle.setProperty(`--color-${colorName}`, colors[colorName]);
    });
    this.onlinePresenceService.start();
  }

  ngOnDestroy() {
    this.onlinePresenceService.stop();
  }
  navegar(){
    this.router.navigate(['/Login']);
  }

  closeNotification() {
    this.notificationService.close();
  }
}
