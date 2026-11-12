import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';

export interface SelectMenuOption { value: any; label: string; }

let nextId = 0;

/**
 * Seleção no visual do HomeEasy (o menu nativo do <select> não aceita estilo).
 * Teclado: Enter/Espaço/↓ abre; ↑/↓ navegam; Enter escolhe; Esc fecha.
 */
@Component({
  standalone: false,
  selector: 'app-select-menu',
  templateUrl: './select-menu.component.html',
  styleUrls: ['./select-menu.component.css']
})
export class SelectMenuComponent {
  @Input() options: SelectMenuOption[] = [];
  @Input() value: any;
  @Input() placeholder = 'Selecionar';
  @Input() ariaLabel = '';
  @Input() disabled = false;
  @Input() variant: 'plain' | 'field' = 'plain';
  @Output() valueChange = new EventEmitter<any>();

  open = false;
  activeIndex = -1;
  readonly listId = `select-menu-${++nextId}`;

  constructor(private host: ElementRef<HTMLElement>) { }

  get selectedLabel() {
    return this.options.find(option => option.value === this.value)?.label ?? this.placeholder;
  }

  toggle() {
    if (this.disabled) return;
    this.open ? this.close() : this.openMenu();
  }

  openMenu() {
    this.open = true;
    this.activeIndex = Math.max(0, this.options.findIndex(option => option.value === this.value));
    setTimeout(() => this.scrollActiveIntoView());
  }

  close() { this.open = false; }

  choose(option: SelectMenuOption) {
    this.value = option.value;
    this.valueChange.emit(option.value);
    this.close();
    this.host.nativeElement.querySelector<HTMLButtonElement>('.selectTrigger')?.focus();
  }

  onKeydown(event: KeyboardEvent) {
    if (this.disabled) return;
    const last = this.options.length - 1;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.open) { this.openMenu(); return; }
        this.activeIndex = Math.min(last, this.activeIndex + 1);
        this.scrollActiveIntoView();
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!this.open) { this.openMenu(); return; }
        this.activeIndex = Math.max(0, this.activeIndex - 1);
        this.scrollActiveIntoView();
        break;
      case 'Home': if (this.open) { event.preventDefault(); this.activeIndex = 0; this.scrollActiveIntoView(); } break;
      case 'End': if (this.open) { event.preventDefault(); this.activeIndex = last; this.scrollActiveIntoView(); } break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.open && this.options[this.activeIndex]) this.choose(this.options[this.activeIndex]);
        else this.openMenu();
        break;
      case 'Escape': if (this.open) { event.preventDefault(); event.stopPropagation(); this.close(); } break;
      case 'Tab': this.close(); break;
    }
  }

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: MouseEvent) {
    if (this.open && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  private scrollActiveIntoView() {
    this.host.nativeElement.querySelector(`#${this.listId}-${this.activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }
}
