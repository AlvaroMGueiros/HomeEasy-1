import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Output, ViewChild } from '@angular/core';

import { UserIntent } from '../../Servicos/user-intent.service';

@Component({
  standalone: false,
  selector: 'app-role-choice-modal',
  templateUrl: './role-choice-modal.component.html',
  styleUrls: ['./role-choice-modal.component.css']
})
export class RoleChoiceModalComponent implements AfterViewInit {
  @Output() choose = new EventEmitter<UserIntent>();
  @Output() dismiss = new EventEmitter<void>();
  @ViewChild('firstAction') firstAction: ElementRef<HTMLButtonElement>;

  ngAfterViewInit() {
    setTimeout(() => this.firstAction?.nativeElement.focus());
  }

  @HostListener('document:keydown.escape')
  close() { this.dismiss.emit(); }

  pick(intent: UserIntent) { this.choose.emit(intent); }
}
