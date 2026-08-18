import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { LoginServiceService } from '../../Servicos/login-service.service';
import { UsuarioService } from '../../Servicos/usuario.service';
import { ServicoPedidoService } from './../../Servicos/servico-pedido.service';
import { ServicosService } from '../../Servicos/servicos.service';
import { Usuario } from './../../Usuarios/usuario';
import { Servico } from './../../Usuarios/servico';
import { ServicoPedido } from './../../Usuarios/serico-pedido';
import { NotificationService } from '../../shared/notification/notification.service';

@Component({
  selector: 'app-addprofissioanl',
  templateUrl: './addprofissioanl.component.html',
  styleUrls: ['./addprofissioanl.component.css']
})
export class AddprofissioanlComponent implements OnInit {
 entrarSair : boolean;
 userId : string; 
 usuario : Usuario = {};
 userSubscription : Subscription;
 servicosArray = new Array<Servico>();
 servicosSubscription : Subscription;
 servicoSelecionado : Servico;
 servePedido : ServicoPedido = {};
 isSubmitting = false;

  constructor( 
    public servico : ServicosService, 
    public loginService : LoginServiceService,
    public usuarioService : UsuarioService,
    public servicoPedido : ServicoPedidoService,
    public afAuth : AngularFireAuth,
    public router : Router,
    private notificationService: NotificationService
  ) { }

  ngOnInit() {
    if(this.afAuth.auth.currentUser != null){
      this.entrarSair = true;
      this.userId = this.afAuth.auth.currentUser.uid;
    } else this.entrarSair = false;

    this.userSubscription = this.usuarioService.getUsuario(this.userId).subscribe(data => {
      this.usuario = data; 
    });

    this.servicosSubscription = this.servico.getServicos().subscribe(data => {
      this.servicosArray = data;
    });
  }
  ngOnDestroy(){
    if(this.afAuth.auth.currentUser != null){
      this.userSubscription.unsubscribe();
      this.servicosSubscription.unsubscribe();
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
  async inscreverServico(){
    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.servePedido.id = this.servicoSelecionado.id;
    try {
      await Promise.all([
        this.servicoPedido.addServicoPedido(this.usuario, this.servicoSelecionado, this.servePedido),
        this.servico.addUsuario(this.usuario, this.servicoSelecionado)
      ]);
      this.notificationService.showSuccess('Serviço cadastrado', 'Sua especialidade já está disponível para novos clientes.');
      this.router.navigate(['/feed']);
    } catch (error) {
      this.notificationService.showError('Não foi possível cadastrar', 'Verifique sua conexão e tente publicar o serviço novamente.');
    } finally {
      this.isSubmitting = false;
    }
  }
}
