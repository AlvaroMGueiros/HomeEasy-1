import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { ActivatedRoute, Router, Params} from '@angular/router';
import { Subscription } from 'rxjs';

import { Usuario } from './../Usuarios/usuario';
import { Chat } from './../Usuarios/chat';
import { UsuarioService } from '../Servicos/usuario.service';
import { ServicosService } from './../Servicos/servicos.service';
import { LoginServiceService } from '../Servicos/login-service.service';
import { ServicoPedidoService } from './../Servicos/servico-pedido.service';
import { ChatService } from './../Servicos/chat.service';
import { FeedbackType } from '../shared/action-feedback/action-feedback.component';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {
  servidor : Usuario = {}; //info do servidor
  servidorSubscription : Subscription;
  servidorId : string; //id do servidor
  servidorIdSubscription : Subscription;
  entrarSair : boolean;
  mensagensArray = new Array<Chat>(); //array com as mensagens
  mensagensArraySubscription : Subscription;
  mensagem : Chat = {}; //mensagem que vai ser enviada
  userId : string; //id do cliente
  usuario : Usuario = {}; //info do cliente
  userSubscription : Subscription;
  feedbackMessage = '';
  feedbackType: FeedbackType = 'error';
  isSending = false;

  constructor(
    public afs : AngularFirestore, 
    public afAuth : AngularFireAuth,
    public loginService : LoginServiceService,
    public servico : ServicosService, 
    public servicoPedido : ServicoPedidoService,
    public usuarioService : UsuarioService,
    public chatService : ChatService,
    public router : Router,
    public active : ActivatedRoute
  ) { }

  ngOnInit() {
    if(this.afAuth.auth.currentUser != null){
      this.entrarSair = true;
      this.userId = this.afAuth.auth.currentUser.uid;
    }else this.entrarSair = false;

    this.servidorIdSubscription = this.active.params.subscribe(
      (params : Params) => { this.servidorId = params['id'] }
    );
    this.servidorSubscription = this.usuarioService.getUserWithProfilePhoto(this.servidorId).subscribe(data => {
      this.servidor = data; 
    });
    this.userSubscription = this.usuarioService.getUserWithProfilePhoto(this.userId).subscribe(data => {
      this.usuario = data; 
    });
    this.mensagensArraySubscription = this.chatService.getMensagens(this.userId, this.servidorId).subscribe(data => {
      this.mensagensArray = data;
    });
  }
  async enviarMensagem(){
    if (this.isSending) {
      return;
    }

    if(this.usuario.id === this.servidor.id){
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
      await this.chatService.sendMessage(this.usuario, this.servidor, messageToSend);
      this.mensagem.mensagem = '';
    } catch (error) {
      this.feedbackType = 'error';
      this.feedbackMessage = 'A mensagem não foi enviada. Verifique sua conexão e tente novamente.';
    } finally {
      this.isSending = false;
    }
  }
  ngOnDestroy(){
    this.servidorIdSubscription.unsubscribe();
    this.servidorSubscription.unsubscribe();
    this.mensagensArraySubscription.unsubscribe();
    this.userSubscription.unsubscribe();
  }
  async sair(){
    try{
      await this.loginService.sair().then(
        (success) => {this.router.navigate(["/home"])});
     }catch(error){
       console.error(error);
    }
  }

}
