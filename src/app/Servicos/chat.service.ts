import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, timer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { Chat } from '../Usuarios/chat';
import { Usuario } from '../Usuarios/usuario';
import { ApiSessionService } from './api-session.service';
import { UsuarioService } from './usuario.service';

interface ApiConversation {
  id: string;
  orderId: string;
  service: { id: string; name: string };
  orderStatus: string;
  isWritable: boolean;
  otherUser: { id: string; name: string; profilePhotoMediaId?: string };
  unreadCount: number;
  lastMessageAt?: string;
}

interface ApiMessage {
  id: string;
  senderId: string;
  content?: string;
  budgetAmount?: string;
  createdAt: string;
  readAt?: string;
  attachment?: { mediaId: string; fileName: string; contentType: string };
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  markConversationRead(conversationId: string) { return this.http.patch(`${environment.apiUrl}/conversations/${conversationId}/read`, {}); }
  sendImage(conversationId: string, mediaId: string) { return this.http.post<ApiMessage>(`${environment.apiUrl}/conversations/${conversationId}/messages`, { type: 'image', mediaId }); }
  getPresence(conversationId: string) { return timer(0, 5000).pipe(switchMap(() => this.http.get<{ isOnline: boolean; isTyping: boolean }>(`${environment.apiUrl}/conversations/${conversationId}/presence`))); }
  setTyping(conversationId: string, isTyping: boolean) { return this.http.put(`${environment.apiUrl}/presence`, { conversationId, isTyping }); }
  constructor(private http: HttpClient, private sessionService: ApiSessionService, private users: UsuarioService) {}

  addMensagem(clientId: string, professionalId: string, message: Chat) {
    return this.sendMessageByParticipant(professionalId, message);
  }

  getMensagens(clientId: string, professionalId: string) {
    return this.findConversation(professionalId).pipe(
      switchMap(conversation =>
        timer(0, 4000).pipe(
          switchMap(() => this.http.get<ApiMessage[]>(
            `${environment.apiUrl}/conversations/${conversation.id}/messages`
          ))
        )
      ),
      map(messages => messages.map(message => this.toChat(message)))
    );
  }

  getMessagesByConversation(conversationId: string) {
    return timer(0, 4000).pipe(
      switchMap(() => this.http.get<ApiMessage[]>(
        `${environment.apiUrl}/conversations/${conversationId}/messages`
      )),
      map(messages => messages.map(message => this.toChat(message)))
    );
  }

  getConversation(conversationId: string) {
    return this.http.get<ApiConversation[]>(`${environment.apiUrl}/conversations`).pipe(
      map(conversations => {
        const conversation = conversations.find(current => current.id === conversationId);
        if (!conversation) {
          throw new Error('Conversa não encontrada para este serviço.');
        }
        return conversation;
      })
    );
  }

  createFromOrder(orderId: string) {
    return this.http.post<ApiConversation>(`${environment.apiUrl}/conversations/orders/${orderId}`, {});
  }

  addCliente(client: Usuario, professional: Usuario) {
    return Promise.resolve({ clientId: client.id, professionalId: professional.id });
  }

  sendMessage(client: Usuario, professional: Usuario, message: Chat) {
    const otherUserId = this.getOtherUserId(client, professional);
    return this.sendMessageByParticipant(otherUserId, message);
  }

  async deleteContato(client: Usuario, professional: Usuario) {
    const blockedUserId = this.getOtherUserId(client, professional);
    await firstValueFrom(this.http.put(`${environment.apiUrl}/blocks/${blockedUserId}`, {}));
  }

  getContatos(userId: string) {
    return this.http.get<ApiConversation[]>(`${environment.apiUrl}/conversations`).pipe(
      map(conversations =>
        conversations.map(conversation => ({
          id: conversation.otherUser.id,
          nome: conversation.otherUser.name,
          profilePhotoMediaId: conversation.otherUser.profilePhotoMediaId,
          foto: conversation.otherUser.profilePhotoMediaId ? this.users.getProfilePhotoUrl(conversation.otherUser.profilePhotoMediaId) : undefined,
          conversationId: conversation.id,
          conversationOrderId: conversation.orderId,
          conversationServiceName: conversation.service.name,
          conversationWritable: conversation.isWritable,
          conversationOrderStatus: conversation.orderStatus,
          unreadMessageCount: conversation.unreadCount
        } as Usuario))
      )
    );
  }

  async sendMessageByConversation(conversationId: string, message: Chat) {
    const savedMessage = await firstValueFrom(
      this.http.post<ApiMessage>(`${environment.apiUrl}/conversations/${conversationId}/messages`, {
        type: 'text',
        content: message.mensagem
      })
    );
    return this.toChat(savedMessage);
  }

  private async sendMessageByParticipant(otherUserId: string, message: Chat) {
    const conversation = await firstValueFrom(this.findConversation(otherUserId));
    const savedMessage = await firstValueFrom(
      this.http.post<ApiMessage>(`${environment.apiUrl}/conversations/${conversation.id}/messages`, {
        type: 'text',
        content: message.mensagem
      })
    );
    return this.toChat(savedMessage);
  }

  private findConversation(otherUserId: string) {
    return this.http.get<ApiConversation[]>(`${environment.apiUrl}/conversations`).pipe(
      map(conversations => {
        const conversation = conversations.find(current => current.otherUser.id === otherUserId);
        if (!conversation) {
          throw new Error('Nenhuma conversa ativa foi encontrada com este usuário.');
        }
        return conversation;
      })
    );
  }

  private toChat(message: ApiMessage): Chat {
    const createdAt = new Date(message.createdAt);
    return {
      id: message.id,
      mensagem: message.content || (message.budgetAmount ? `Orçamento: R$ ${message.budgetAmount}` : ''),
      data: createdAt.getTime(),
      hora: createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      senderId: message.senderId,
      readAt: message.readAt,
      attachmentMediaId: message.attachment?.mediaId,
      attachmentName: message.attachment?.fileName
    };
  }

  private getOtherUserId(client: Usuario, professional: Usuario) {
    const currentUserId = this.sessionService.currentUser?.id;
    return client.id === currentUserId ? professional.id : client.id;
  }
}
