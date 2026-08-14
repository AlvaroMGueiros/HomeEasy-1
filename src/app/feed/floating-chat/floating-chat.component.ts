import { Component, HostListener, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';

import { ChatService } from '../../Servicos/chat.service';
import { Usuario } from '../../Usuarios/usuario';

@Component({
  selector: 'app-floating-chat',
  templateUrl: './floating-chat.component.html',
  styleUrls: ['./floating-chat.component.css']
})
export class FloatingChatComponent implements OnChanges, OnDestroy {
  @Input() authenticated = false;
  @Input() userId: string;

  contacts = new Array<Usuario>();
  contactsSubscription: Subscription;
  isLoading = false;
  isOpen = false;

  constructor(private chatService: ChatService) { }

  ngOnChanges(changes: SimpleChanges) {
    if ((changes.userId || changes.authenticated) && this.authenticated && this.userId) {
      this.loadContacts();
    }

    if (!this.authenticated) {
      this.closeChat();
      this.clearContactsSubscription();
    }
  }

  ngOnDestroy() {
    this.clearContactsSubscription();
  }

  @HostListener('document:keydown.escape')
  closeOnEscape() {
    this.closeChat();
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
  }

  closeChat() {
    this.isOpen = false;
  }

  trackByContactId(index: number, contact: Usuario) {
    return contact.id;
  }

  private loadContacts() {
    this.clearContactsSubscription();
    this.isLoading = true;
    this.contactsSubscription = this.chatService.getContatos(this.userId).subscribe(contacts => {
      this.contacts = contacts;
      this.isLoading = false;
    });
  }

  private clearContactsSubscription() {
    if (this.contactsSubscription) {
      this.contactsSubscription.unsubscribe();
      this.contactsSubscription = null;
    }
  }
}
