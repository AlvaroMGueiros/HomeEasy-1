import { DOCUMENT } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';

export type DialogType = 'error' | 'info' | 'success' | 'warning';

@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.css']
})
export class DialogComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() title = '';
  @Input() message = '';
  @Input() type: DialogType = 'info';
  @Input() confirmation = false;
  @Input() dangerAction = false;
  @Input() loading = false;
  @Input() confirmLabel = 'Entendi';
  @Input() cancelLabel = 'Voltar';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @ViewChild('primaryButton') primaryButton: ElementRef;
  @ViewChild('cancelButton') cancelButton: ElementRef;

  private previouslyFocusedElement: HTMLElement;
  private previousBodyOverflow = '';

  constructor(@Inject(DOCUMENT) private document: Document) { }

  ngOnChanges(changes: SimpleChanges) {
    if (!changes.open) {
      return;
    }

    if (this.open) {
      this.openDialog();
    } else {
      this.restorePageState();
    }
  }

  ngOnDestroy() {
    this.restorePageState();
  }

  @HostListener('document:keydown.escape')
  closeWithEscape() {
    if (this.open && !this.loading) {
      this.cancelDialog();
    }
  }

  @HostListener('document:keydown.tab', ['$event'])
  keepFocusInsideDialog(keyboardEvent: KeyboardEvent) {
    if (!this.open || !this.primaryButton) {
      return;
    }

    if (!this.confirmation || !this.cancelButton) {
      keyboardEvent.preventDefault();
      this.primaryButton.nativeElement.focus();
      return;
    }

    const activeElement = this.document.activeElement;
    if (keyboardEvent.shiftKey && activeElement === this.cancelButton.nativeElement) {
      keyboardEvent.preventDefault();
      this.primaryButton.nativeElement.focus();
      return;
    }

    if (!keyboardEvent.shiftKey && activeElement === this.primaryButton.nativeElement) {
      keyboardEvent.preventDefault();
      this.cancelButton.nativeElement.focus();
    }
  }

  confirmDialog() {
    if (!this.loading) {
      this.confirm.emit();
    }
  }

  cancelDialog() {
    if (this.loading) {
      return;
    }

    if (this.confirmation) {
      this.cancel.emit();
      return;
    }

    this.confirm.emit();
  }

  get icon(): string {
    if (this.type === 'success') {
      return '✓';
    }

    if (this.type === 'error') {
      return '!';
    }

    if (this.type === 'warning') {
      return '!';
    }

    return 'i';
  }

  private openDialog() {
    this.previouslyFocusedElement = this.document.activeElement as HTMLElement;
    this.previousBodyOverflow = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
    setTimeout(() => {
      if (this.primaryButton) {
        this.primaryButton.nativeElement.focus();
      }
    });
  }

  private restorePageState() {
    this.document.body.style.overflow = this.previousBodyOverflow;
    if (this.previouslyFocusedElement && this.previouslyFocusedElement.focus) {
      this.previouslyFocusedElement.focus();
      this.previouslyFocusedElement = null;
    }
  }
}
