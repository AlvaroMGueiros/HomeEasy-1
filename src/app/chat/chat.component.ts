import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { MediaUploadService, MediaPurpose } from '../Servicos/media-upload.service';
import { createCompressedImageAttachment } from '../shared/utils/image-attachment.utils';
import { resolveHttpErrorMessage } from '../shared/utils/http-error.utils';

import { LoginServiceService } from '../Servicos/login-service.service';
import { ServicoPedidoService } from './../Servicos/servico-pedido.service';
import { ServicosService } from './../Servicos/servicos.service';
import { UsuarioService } from '../Servicos/usuario.service';
import { ChatService } from './../Servicos/chat.service';
import { Chat } from './../Usuarios/chat';
import { Usuario } from './../Usuarios/usuario';
import { FeedbackType } from '../shared/action-feedback/action-feedback.component';
import { getCurrentUser } from '../shared/utils/session-user.utils';
import { isScrolledToEnd } from '../shared/utils/scroll-position.utils';

@Component({
  standalone: false,
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messageList') messageList: ElementRef<HTMLDivElement>;
  private scrollToLatestPending = true;
  private followLatest = true;
  servidor: Usuario = {};
  servidorSubscription: Subscription;
  servidorId: string;
  servidorIdSubscription: Subscription;
  conversationId: string;
  conversationSubscription: Subscription;
  conversationServiceName = '';
  conversationWritable = true;
  entrarSair: boolean;
  mensagensArray = new Array<Chat>();
  mensagensArraySubscription: Subscription;
  mensagem: Chat = {};
  userId: string;
  usuario: Usuario = {};
  userSubscription: Subscription;
  feedbackMessage = '';
  feedbackType: FeedbackType = 'error';
  isSending = false;
  isOnline = false;
  isTyping = false;
  async refreshConversationAccess() {
    try { const conversation = await firstValueFrom(this.chatService.getConversation(this.conversationId)); this.conversationWritable = conversation.isWritable; }
    catch (failure) { this.conversationWritable = false; this.feedbackType = 'error'; this.feedbackMessage = resolveHttpErrorMessage(failure, 'Não foi possível atualizar o acesso à conversa.'); }
  }
  private presenceSubscription: Subscription;
  private typingTimer: ReturnType<typeof setTimeout>;
  private attachmentUrls = new Map<string, { url: string; expiresAt: number }>();
  private resolvingAttachments = false;
  private typingSent = false;

  constructor(
    public loginService: LoginServiceService,
    public servico: ServicosService,
    public servicoPedido: ServicoPedidoService,
    public usuarioService: UsuarioService,
    public chatService: ChatService,
    public router: Router,
    public active: ActivatedRoute,
    private media: MediaUploadService
  ) {}

  ngOnInit() {
    const currentUser = getCurrentUser();
    if (currentUser != null) {
      this.entrarSair = true;
      this.userId = currentUser.uid || currentUser.id;
    } else {
      this.entrarSair = false;
    }

    this.servidorIdSubscription = this.active.params.subscribe((params: Params) => {
      clearTimeout(this.typingTimer);
      if (this.conversationId && this.typingSent) {
        void firstValueFrom(this.chatService.setTyping(this.conversationId, false)).catch(() => undefined);
      }
      this.typingSent = false;
      this.scrollToLatestPending = true;
      this.followLatest = true;
      this.conversationWritable = false;
      this.conversationSubscription?.unsubscribe(); this.servidorSubscription?.unsubscribe(); this.mensagensArraySubscription?.unsubscribe(); this.presenceSubscription?.unsubscribe();
      this.attachmentUrls.clear(); this.mensagensArray = [];
      this.conversationId = params['id'];
      this.presenceSubscription = this.chatService.getPresence(this.conversationId).subscribe({ next: presence => { this.isOnline = presence.isOnline; this.isTyping = presence.isTyping; }, error: () => { this.isOnline = false; this.isTyping = false; } });
      this.conversationSubscription = this.chatService.getConversation(this.conversationId).subscribe(conversation => {
        this.servidorId = conversation.otherUser.id;
        this.conversationServiceName = conversation.service.name;
        this.conversationWritable = conversation.isWritable;
        this.servidorSubscription = this.usuarioService.getUserWithProfilePhoto(this.servidorId).subscribe(data => {
          this.servidor = data;
        });
        this.mensagensArraySubscription = this.chatService.getMessagesByConversation(this.conversationId).subscribe(data => {
          if (this.followLatest) this.scrollToLatestPending = true;
          this.mensagensArray = data;
          void this.resolveImages();
          if (document.visibilityState === 'visible') void firstValueFrom(this.chatService.markConversationRead(this.conversationId)).catch(() => undefined);
        });
      });
    });
    this.userSubscription = this.usuarioService.getUserWithProfilePhoto(this.userId).subscribe(data => {
      this.usuario = data;
    });
  }

  ngAfterViewChecked() {
    if (!this.scrollToLatestPending || !this.messageList || !this.mensagensArray.length) return;
    const container = this.messageList.nativeElement;
    container.scrollTop = container.scrollHeight;
    this.scrollToLatestPending = false;
    this.followLatest = true;
  }

  onMessagesScroll() {
    if (this.messageList) this.followLatest = isScrolledToEnd(this.messageList.nativeElement);
  }

  onMessageImageLoad() { if (this.followLatest) this.scrollToLatestPending = true; }

  trackMessage(index: number, message: Chat) { return message.id || index; }

  async enviarMensagem() {
    if (this.isSending) {
      return;
    }

    if (!this.conversationWritable) {
      this.feedbackType = 'error';
      this.feedbackMessage = 'Este serviço foi encerrado. A conversa está disponível somente para consulta.';
      return;
    }

    if (this.usuario.id === this.servidor.id) {
      this.feedbackType = 'error';
      this.feedbackMessage = 'Você não pode enviar uma mensagem para si mesmo.';
      return;
    }

    const currentDate = new Date();
    const messageToSend: Chat = {
      mensagem: this.mensagem.mensagem,
      data: currentDate.getTime(),
      id: this.userId,
      hora: currentDate.getHours() + ':' + currentDate.getMinutes().toString().padStart(2, '0')
    };

    this.feedbackMessage = '';
    this.isSending = true;

    try {
      const savedMessage = await this.chatService.sendMessageByConversation(this.conversationId, messageToSend);
      this.mensagensArray = [...this.mensagensArray, savedMessage];
      this.scrollToLatestPending = true;
      this.mensagem.mensagem = '';
    } catch (error) {
      this.feedbackType = 'error';
      this.feedbackMessage = 'A mensagem não foi enviada. Verifique sua conexão e tente novamente.';
    } finally {
      this.isSending = false;
    }
  }

  ngOnDestroy() {
    this.presenceSubscription?.unsubscribe();
    clearTimeout(this.typingTimer);
    void firstValueFrom(this.chatService.setTyping(this.conversationId, false)).catch(() => undefined);
    this.servidorIdSubscription?.unsubscribe();
    this.conversationSubscription?.unsubscribe();
    this.servidorSubscription?.unsubscribe();
    this.mensagensArraySubscription?.unsubscribe();
    this.userSubscription?.unsubscribe();
  }

  onTyping() {
    clearTimeout(this.typingTimer);
    const isTyping = Boolean(this.mensagem.mensagem);
    if (isTyping !== this.typingSent) { this.typingSent = isTyping; void firstValueFrom(this.chatService.setTyping(this.conversationId, isTyping)).catch(() => undefined); }
    this.typingTimer = setTimeout(() => { this.typingSent = false; void firstValueFrom(this.chatService.setTyping(this.conversationId, false)).catch(() => undefined); }, 1800);
  }
  private async resolveImages() {
    if (this.resolvingAttachments) return;
    const conversationId = this.conversationId;
    this.resolvingAttachments = true;
    try {
      for (const message of this.mensagensArray) {
        if (!message.attachmentMediaId) continue;
        let cached = this.attachmentUrls.get(message.attachmentMediaId);
        if (!cached || cached.expiresAt <= Date.now()) {
          const response = await firstValueFrom(this.media.getDownloadUrl(message.attachmentMediaId));
          if (conversationId !== this.conversationId) return;
          cached = { url: response.downloadUrl, expiresAt: Date.now() + Math.max(0, response.expiresInSeconds - 30) * 1000 };
          this.attachmentUrls.set(message.attachmentMediaId, cached);
        }
        message.attachmentUrl = cached.url;
      }
    } catch (failure) { this.feedbackType = 'error'; this.feedbackMessage = resolveHttpErrorMessage(failure, 'Não foi possível carregar uma foto da conversa.'); }
    finally { this.resolvingAttachments = false; }
  }
  async sendPhoto(event: Event) {
    const input = event.target as HTMLInputElement;
    const photo = input.files?.[0];
    if (!photo || this.isSending || !this.conversationWritable) return;
    this.isSending = true; this.feedbackMessage = '';
    try {
      const attachment = await createCompressedImageAttachment(photo);
      const mediaId = await this.media.uploadDataUrl(attachment, MediaPurpose.ChatAttachment);
      await firstValueFrom(this.chatService.sendImage(this.conversationId, mediaId));
    } catch (failure) { this.feedbackType = 'error'; this.feedbackMessage = resolveHttpErrorMessage(failure, 'Não foi possível enviar a foto.'); }
    finally { this.isSending = false; input.value = ''; }
  }

  async sair() {
    try {
      await this.loginService.sair().then(() => {
        this.router.navigate(['/home']);
      });
    } catch (error) {
      return;
    }
  }
}
