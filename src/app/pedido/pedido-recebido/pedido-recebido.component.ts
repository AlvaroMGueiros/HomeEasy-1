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

@Component({
  selector: 'app-pedido-recebido',
  templateUrl: './pedido-recebido.component.html',
  styleUrls: ['./pedido-recebido.component.css']
})
export class PedidoRecebidoComponent implements OnInit {
 usuario : Usuario = {};
 userSubscription : Subscription;
 userId : string;
 entrarSair : boolean;
 pedidosRecebidosArray = new Array<Pedido>();
 pedidosRecebidosSubscription : Subscription;
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
    this.pedidosRecebidosSubscription = this.servicoPedido.getPedidosRecebidos(this.userId).subscribe(data => {
      this.pedidosRecebidosArray = data;
      this.isLoading = false;
    });
  }
  ngOnDestroy(){ 
    this.userSubscription.unsubscribe();
    this.pedidosRecebidosSubscription.unsubscribe();
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
}
