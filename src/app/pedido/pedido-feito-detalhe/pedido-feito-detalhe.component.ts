import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireStorage } from '@angular/fire/storage';
import { Subscription } from 'rxjs';

import { LoginServiceService } from '../../Servicos/login-service.service';
import { ServicoPedidoService } from './../../Servicos/servico-pedido.service';
import { UsuarioService } from './../../Servicos/usuario.service';
import { Usuario } from 'src/app/Usuarios/usuario';
import { Servico } from './../../Usuarios/servico';
import { OrderStatus, Pedido } from 'src/app/Usuarios/pedido';
import { AvalicaoService } from './../../Servicos/avaliacao.service';
import { Avaliacao } from './../../Usuarios/avaliacao';
import { ServicosService } from './../../Servicos/servicos.service';
import { FeedbackType } from '../../shared/action-feedback/action-feedback.component';
import { canTransitionOrder, getOrderStatus, getOrderStatusClass, getOrderStatusHistory, getOrderStatusLabel } from '../../shared/utils/order-status.utils';

@Component({
  selector: 'app-pedido-feito-detalhe',
  templateUrl: './pedido-feito-detalhe.component.html',
  styleUrls: ['./pedido-feito-detalhe.component.css']
})
export class PedidoFeitoDetalheComponent implements OnInit {
  userId : string; //id do usuario
  entrarSair : boolean;
  pedidoId : string; //id do pedido
  pedidoIdSubscription : Subscription;
  pedido : Pedido = {} //o pedido
  pedidoSubscription : Subscription;
  avaliacao : Avaliacao = {}; //avaliacao do servico
  avaliacaoSubscription : Subscription;
  servidorId : string; //id do servidor
  servidorIdSubscription : Subscription;
  servidor : Usuario = {}; //o servidor
  servidorSubscription : Subscription;
  usuario : Usuario = {}; //usuario | cliente
  usuarioSubscription : Subscription;
  mes : number = new Date().getUTCMonth()+1;
  ano : number = new Date().getFullYear(); 
  dia : number = new Date().getDate();
  today = new Date().toJSON().split('T')[0];
  feedbackMessage = '';
  feedbackType: FeedbackType = 'error';
  isSubmitting = false;
  isConfirmingCancellation = false;

  constructor(
    public afs : AngularFirestore, 
    public afAuth : AngularFireAuth,
    public storage : AngularFireStorage,
    public loginService : LoginServiceService,
    public servicoPedido : ServicoPedidoService,
    public usuarioService : UsuarioService,
    public avaliacaoService : AvalicaoService,
    public servicosService : ServicosService,
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
    this.pedidoIdSubscription = this.active.params.subscribe(
      (params : Params) => { this.pedidoId = params['idd'] }
    );
    this.servidorSubscription = this.usuarioService.getUsuario(this.servidorId).subscribe(data => {
      this.servidor = data;
    });
    this.pedidoSubscription = this.servicoPedido.getPedidoFeito(this.userId, this.pedidoId).subscribe(data => {
      this.pedido = data; 
    });
    this.usuarioSubscription = this.usuarioService.getUsuario(this.userId).subscribe(data => {
      this.usuario = data;
    });
  }
  ngOnDestroy(){
    this.servidorIdSubscription.unsubscribe();
    this.servidorSubscription.unsubscribe();
    this.pedidoIdSubscription.unsubscribe();
    this.pedidoSubscription.unsubscribe();
    this.usuarioSubscription.unsubscribe();
  }
  async sair(){
    try{
      await this.loginService.sair().then(
        (success) => {this.router.navigate(["/home"])});
     }catch(error){
       console.error(error);
    }
  }
  async addAvaliacao(){
    if (this.isSubmitting) {
      return;
    }

    this.feedbackMessage = '';
    this.isSubmitting = true;
    this.avaliacao.nomeContratante = this.usuario.nome;
    this.avaliacao.idServidor = this.servidorId;
    this.avaliacao.idPedido = this.pedidoId;
    this.avaliacao.idServico = this.pedido.idServico;
    this.avaliacao.data = this.dia + "/" + this.mes + "/" + this.ano;
    let ratingPublished = false;
    try {
      await this.avaliacaoService.addAvaliacao(this.avaliacao, this.servidorId, this.pedido.idServico);
      ratingPublished = true;
      await this.servicoPedido.updateOrderStatus(this.pedido, OrderStatus.Completed, this.userId);
      this.feedbackType = 'success';
      this.feedbackMessage = 'Avaliação publicada com sucesso.';
    } catch (error) {
      this.feedbackType = 'error';
      if (ratingPublished) {
        this.feedbackMessage = 'A avaliação foi publicada, mas não foi possível concluir o pedido. Tente novamente.';
      } else {
        this.feedbackMessage = 'Não foi possível publicar a avaliação. Tente novamente.';
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  async acceptProposal(){
    if (this.isSubmitting) {
      return;
    }

    this.feedbackMessage = '';
    this.isSubmitting = true;
    try {
      await this.servicoPedido.updateOrderStatus(this.pedido, OrderStatus.Accepted, this.userId);
      this.feedbackType = 'success';
      this.feedbackMessage = 'Proposta aceita. Use a conversa para combinar os últimos detalhes.';
    } catch (error) {
      this.feedbackType = 'error';
      this.feedbackMessage = error && error.message ? error.message : 'Não foi possível aceitar a proposta. Tente novamente.';
    } finally {
      this.isSubmitting = false;
    }
  }

  requestCancellation(){
    this.isConfirmingCancellation = true;
    this.feedbackMessage = '';
  }

  dismissCancellation(){
    this.isConfirmingCancellation = false;
  }

  async cancelarPedido(){
    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    try {
      await this.servicoPedido.updateOrderStatus(this.pedido, OrderStatus.CancelledByClient, this.userId);
      this.router.navigate(['/usuario', this.userId, 'pedidos-feitos']);
    } catch (error) {
      this.feedbackType = 'error';
      this.feedbackMessage = 'Não foi possível cancelar o pedido. Tente novamente.';
    } finally {
      this.isSubmitting = false;
      this.isConfirmingCancellation = false;
    }
  }

  get orderStatusLabel() {
    return getOrderStatusLabel(this.pedido);
  }

  get orderStatusClass() {
    return getOrderStatusClass(this.pedido);
  }

  get canCancelOrder() {
    return canTransitionOrder(this.pedido, OrderStatus.CancelledByClient, this.userId);
  }

  get canReviewOrder() {
    const status = getOrderStatus(this.pedido);
    const serviceCanBeReviewed = status === OrderStatus.Accepted || status === OrderStatus.InProgress;

    return serviceCanBeReviewed && this.today >= this.pedido.data;
  }

  get canAcceptProposal() {
    return canTransitionOrder(this.pedido, OrderStatus.Accepted, this.userId) && getOrderStatus(this.pedido) === OrderStatus.ProposalReceived;
  }

  get orderHistory() {
    return getOrderStatusHistory(this.pedido);
  }

}
