import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireStorage } from '@angular/fire/storage';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { Usuario } from './../Usuarios/usuario';
import { Pedido } from './../Usuarios/pedido';
import { Servico } from './../Usuarios/servico';
import { UsuarioService } from '../Servicos/usuario.service';
import { ServicosService } from './../Servicos/servicos.service';
import { LoginServiceService } from '../Servicos/login-service.service';
import { ServicoPedidoService } from './../Servicos/servico-pedido.service';
import { FeedbackType } from '../shared/action-feedback/action-feedback.component';

@Component({
  selector: 'app-servico',
  templateUrl: './servico.component.html',
  styleUrls: ['./servico.component.css']
})
export class ServicoComponent implements OnInit {
  userId : string;
  usuario : Usuario = {};
  userSubscription : Subscription;
  imgSubscription : Subscription;
  entrarSair : boolean;
  servicosArray = new Array<Servico>();
  servicosSubscription : Subscription;
  servicePendingDeletion: Servico;
  isDeletingService = false;
  feedbackMessage = '';
  feedbackType: FeedbackType = 'success';

  constructor(
    public afs : AngularFirestore, 
    public afAuth : AngularFireAuth,
    public storage : AngularFireStorage,
    public router : Router,
    public loginService : LoginServiceService,
    public usuarioService : UsuarioService,
    public servicoPedido : ServicoPedidoService,
    public servico : ServicosService, 
    public active : ActivatedRoute
    ) { }

  ngOnInit() {
    if(this.afAuth.auth.currentUser != null){
      this.entrarSair = true;
      this.userId = this.afAuth.auth.currentUser.uid;
    }else this.entrarSair = false;

    this.userSubscription = this.usuarioService.getUsuario(this.userId).subscribe(data => {
      this.usuario = data; 
    });
    this.servicosSubscription = this.servico.getUserServico(this.userId).subscribe(data => {
      this.servicosArray = data;
    });
  }
  ngOnDestroy(){ 
    this.userSubscription.unsubscribe();
    this.servicosSubscription.unsubscribe();
  }
  requestServiceDeletion(service: Servico){
    this.servicePendingDeletion = service;
    this.feedbackMessage = '';
  }

  dismissServiceDeletion(){
    this.servicePendingDeletion = null;
  }

  get serviceDeletionTitle(): string {
    if (!this.servicePendingDeletion) {
      return 'Remover serviço';
    }

    return 'Remover ' + this.servicePendingDeletion.nome + '?';
  }

  async confirmServiceDeletion(){
    if (!this.servicePendingDeletion || this.isDeletingService) {
      return;
    }

    const serviceToDelete = this.servicePendingDeletion;
    this.isDeletingService = true;

    try {
      await this.servico.apagarServico(this.usuario, serviceToDelete);
      this.feedbackType = 'success';
      this.feedbackMessage = 'O serviço foi removido do seu perfil.';
      this.servicePendingDeletion = null;
    } catch (error) {
      this.feedbackType = 'error';
      this.feedbackMessage = 'Não foi possível remover o serviço. Verifique sua conexão e tente novamente.';
    } finally {
      this.isDeletingService = false;
    }
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
