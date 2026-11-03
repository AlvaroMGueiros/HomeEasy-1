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
  standalone: false,
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
  @ViewChild('primaryButton') primaryButton: ElementRef<HTMLButtonElement>;
  @ViewChild('cancelButton') cancelButton: ElementRef<HTMLButtonElement>;

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

    const dialog = this.primaryButton.nativeElement.closest('[role="dialog"]');
    if (!dialog) return;
    const focusableElements = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'))
      .filter(element => element.offsetParent !== null);
    if (!focusableElements.length) return;
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = this.document.activeElement;
    if (keyboardEvent.shiftKey && (activeElement === firstElement || !dialog.contains(activeElement))) {
      keyboardEvent.preventDefault(); lastElement.focus();
    } else if (!keyboardEvent.shiftKey && (activeElement === lastElement || !dialog.contains(activeElement))) {
      keyboardEvent.preventDefault(); firstElement.focus();
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
