import { Component, HostListener, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { ChatService } from '../../Servicos/chat.service';
import { UsuarioService } from '../../Servicos/usuario.service';
import { Usuario } from '../../Usuarios/usuario';
import { normalizeSearchText } from '../../shared/utils/text-search.utils';

@Component({
  selector: 'app-floating-chat',
  templateUrl: './floating-chat.component.html',
  styleUrls: ['./floating-chat.component.css']
})
export class FloatingChatComponent implements OnChanges, OnDestroy {
  @Input() authenticated = false;
  @Input() userId: string;
  @Input() docked = false;

  contacts = new Array<Usuario>();
  contactsSubscription: Subscription;
  isLoading = false;
  isOpen = false;
  hasLoadError = false;
  contactSearch = '';

  constructor(
    private chatService: ChatService,
    private usuarioService: UsuarioService
  ) { }

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

  get filteredContacts() {
    const normalizedSearch = normalizeSearchText(this.contactSearch);
    if (!normalizedSearch) {
      return this.contacts;
    }

    return this.contacts.filter(contact => normalizeSearchText(contact.nome || '').indexOf(normalizedSearch) >= 0);
  }

  hideUnavailableContactPhoto(contact: Usuario) {
    contact.foto = '';
  }

  private loadContacts() {
    this.clearContactsSubscription();
    this.isLoading = true;
    this.hasLoadError = false;
    this.contactsSubscription = this.chatService.getContatos(this.userId).pipe(
      switchMap(contacts => this.usuarioService.resolveProfilePhotos(contacts))
    ).subscribe(
      contacts => {
        this.contacts = contacts;
        this.isLoading = false;
      },
      () => {
        this.hasLoadError = true;
        this.isLoading = false;
      }
    );
  }

  private clearContactsSubscription() {
    if (this.contactsSubscription) {
      this.contactsSubscription.unsubscribe();
      this.contactsSubscription = null;
    }
  }
}
