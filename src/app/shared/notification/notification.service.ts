import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { DialogType } from '../dialog/dialog.component';

export interface NotificationState {
  open: boolean;
  title: string;
  message: string;
  type: DialogType;
}

const closedNotification: NotificationState = {
  open: false,
  title: '',
  message: '',
  type: 'info'
};

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private stateSubject = new BehaviorSubject<NotificationState>(closedNotification);
  state$: Observable<NotificationState> = this.stateSubject.asObservable();

  showSuccess(title: string, message: string) {
    this.show(title, message, 'success');
  }

  showError(title: string, message: string) {
    this.show(title, message, 'error');
  }

  showInfo(title: string, message: string) {
    this.show(title, message, 'info');
  }

  close() {
    this.stateSubject.next(closedNotification);
  }

  private show(title: string, message: string, type: DialogType) {
    this.stateSubject.next({
      open: true,
      title,
      message,
      type
    });
  }
}
