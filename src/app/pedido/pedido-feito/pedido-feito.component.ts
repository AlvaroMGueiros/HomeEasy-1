import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireStorage } from '@angular/fire/storage';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { Usuario } from './../../Usuarios/usuario';
import { Pedido } from './../../Usuarios/pedido';
import { Servico } from './../../Usuarios/servico';
import { UsuarioService } from './../../Servicos/usuario.service';
import { ServicosService } from './../../Servicos/servicos.service';
import { LoginServiceService } from './../../Servicos/login-service.service';
import { ServicoPedidoService } from './../../Servicos/servico-pedido.service';
import { getOrderStatusClass, getOrderStatusLabel } from '../../shared/utils/order-status.utils';

@Component({
  selector: 'app-pedido-feito',
  templateUrl: './pedido-feito.component.html',
  styleUrls: ['./pedido-feito.component.css']
})
export class PedidoFeitoComponent implements OnInit {
 usuario : Usuario = {};
 userSubscription : Subscription;
 userId : string;
 entrarSair : boolean;
 pedidosFeitosArray = new Array<Pedido>();
 pedidosFeitosSubscription : Subscription;
 pedidoEstado : boolean = false;
 pedidoDetalhe : Pedido = {};
 isLoading = true;

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
    this.pedidosFeitosSubscription = this.servicoPedido.getPedidosFeitos(this.userId).subscribe(data => {
      this.pedidosFeitosArray = data;
      this.isLoading = false;
    });
  }
  ngOnDestroy(){ 
    this.userSubscription.unsubscribe();
    this.pedidosFeitosSubscription.unsubscribe();
  }
  async sair(){
    try{
      await this.loginService.sair().then(
        (success) => {this.router.navigate(["/home"])});
     }catch(error){
       console.error(error);
    }
  }
  mostrarBotaoDetalhe(event, serve){
    this.pedidoEstado = true;
    this.pedidoDetalhe = serve;
  }
  limparBotao(){
    this.pedidoEstado = false;
  }

  getStatusLabel(order: Pedido) {
    return getOrderStatusLabel(order);
  }

  getStatusClass(order: Pedido) {
    return getOrderStatusClass(order);
  }
}

