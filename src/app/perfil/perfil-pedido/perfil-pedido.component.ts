import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { Subscription } from 'rxjs';

import { ServicosService } from '../../Servicos/servicos.service';
import { LoginServiceService } from '../../Servicos/login-service.service';
import { ServicoPedidoService } from './../../Servicos/servico-pedido.service';
import { Usuario } from 'src/app/Usuarios/usuario';
import { ServicoPedido } from './../../Usuarios/serico-pedido';
import { UsuarioService } from './../../Servicos/usuario.service';

@Component({
  selector: 'app-perfil-pedido',
  templateUrl: './perfil-pedido.component.html',
  styleUrls: ['./perfil-pedido.component.css']
})
export class PerfilPedidoComponent implements OnInit {
 serveID : string;
 serveIDSubscription : Subscription;
 usuarioID : string; 
 usuarioIDSubscription : Subscription;
 usuario : Usuario = {};
 userId : string;  
 entrarSair : boolean;
 userSubscription : Subscription;
 servePedidoSubscription : Subscription;
 servePedido : ServicoPedido = {};

  constructor(
    public afs : AngularFirestore, 
    public afAuth : AngularFireAuth,
    public loginService : LoginServiceService,
    public servico : ServicosService, 
    public servicoPedido : ServicoPedidoService,
    public usuarioService : UsuarioService,
    public router : Router,
    public active : ActivatedRoute
  ) { }

  ngOnInit() {
    if(this.afAuth.auth.currentUser != null){
      this.userId = this.afAuth.auth.currentUser.uid;
      this.entrarSair = true;
    } 
    else this.entrarSair = false;

    this.serveIDSubscription = this.active.params.subscribe(
      (params : Params) => { this.serveID = params['id'] }
    );
    this.usuarioIDSubscription = this.active.params.subscribe(
      (params : Params) => { this.usuarioID = params['idd'] }
    ); 
    this.userSubscription = this.usuarioService.getUserWithProfilePhoto(this.usuarioID).subscribe(data => {
      this.usuario = data; 
    });
    this.servePedidoSubscription = this.servicoPedido.getDetalheServico(this.usuarioID, this.serveID).subscribe(data => {
      this.servePedido = data;}
    );
  }
  ngOnDestroy(){
    this.serveIDSubscription.unsubscribe();
    this.usuarioIDSubscription.unsubscribe();
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
