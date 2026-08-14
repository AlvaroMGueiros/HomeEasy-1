import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  @Input() authenticated = false;
  @Input() userId: string;
  @Output() logout = new EventEmitter<void>();

  menuOpen = false;

  toggleMenu(){
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(){
    this.menuOpen = false;
  }

  @HostListener('document:keydown.escape')
  closeMenuWithKeyboard(){
    this.closeMenu();
  }

  requestLogout(){
    this.closeMenu();
    this.logout.emit();
  }
}
