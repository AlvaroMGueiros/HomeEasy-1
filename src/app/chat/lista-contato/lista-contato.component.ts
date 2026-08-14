import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireStorage } from '@angular/fire/storage';
import { Subscription } from 'rxjs';

import { ServicosService } from '../../Servicos/servicos.service';
import { LoginServiceService } from '../../Servicos/login-service.service';
import { ServicoPedidoService } from './../../Servicos/servico-pedido.service';
import { Usuario } from 'src/app/Usuarios/usuario';
import { ServicoPedido } from './../../Usuarios/serico-pedido';
import { ChatService } from './../../Servicos/chat.service';
import { UsuarioService } from './../../Servicos/usuario.service';

@Component({
  selector: 'app-lista-contato',
  templateUrl: './lista-contato.component.html',
  styleUrls: ['./lista-contato.component.css']
})
export class ListaContatoComponent implements OnInit {
  listaContatos = new Array<Usuario>();
  listaContatosSubscription : Subscription;
  userId : string;
  entrarSair : boolean;
  usuario : Usuario = {};
  userSubscription : Subscription;
  isLoading = true;

  constructor(
    public afs : AngularFirestore, 
    public afAuth : AngularFireAuth,
    public storage : AngularFireStorage,
    public loginService : LoginServiceService,
    public servico : ServicosService, 
    public servicoPedido : ServicoPedidoService,
    public chatService : ChatService,
    public usuarioService : UsuarioService,
    public router : Router,
    public active : ActivatedRoute
  ) { }

  ngOnInit() {
    if(this.afAuth.auth.currentUser != null){
      this.entrarSair = true;
      this.userId = this.afAuth.auth.currentUser.uid;
    }else this.entrarSair = false;

    this.listaContatosSubscription = this.chatService.getContatos(this.userId).subscribe(data => {
      this.listaContatos = data;
      this.isLoading = false;
    });
    this.userSubscription = this.usuarioService.getUsuario(this.userId).subscribe(data => {
      this.usuario = data; 
    });
  }
  async sair(){
    try{
      await this.loginService.sair().then(
        (success) => {this.router.navigate(["/home"])});
     }catch(error){
       console.error(error);
    }
  }
  ngOnDestroy(){
    this.listaContatosSubscription.unsubscribe();
    this.userSubscription.unsubscribe();
  }
 
}
