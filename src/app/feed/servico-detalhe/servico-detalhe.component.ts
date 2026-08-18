import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { ServicosService } from '../../Servicos/servicos.service';
import { LoginServiceService } from '../../Servicos/login-service.service';
import { Usuario } from 'src/app/Usuarios/usuario';
import { UsuarioService } from '../../Servicos/usuario.service';

@Component({
  selector: 'app-servico-detalhe',
  templateUrl: './servico-detalhe.component.html',
  styleUrls: ['./servico-detalhe.component.css']
})
export class ServicoDetalheComponent implements OnInit {
 usuariosArray = new Array<Usuario>();
 usuariosSubscription : Subscription;
 serveID : string;
 serveIDSubscription : Subscription;
 entrarSair : boolean;
 userId : string;
 isLoading = true;

  constructor(
    public afs : AngularFirestore, 
    public afAuth : AngularFireAuth,
    public loginService : LoginServiceService,
    public servico : ServicosService, 
    public usuarioService : UsuarioService,
    public router : Router,
    public active : ActivatedRoute
  ) {}

  ngOnInit() {
    this.serveIDSubscription = this.active.params.subscribe(
    (params : Params) => { this.serveID = params['id'] });

    this.usuariosSubscription = this.servico.getUsuarios(this.serveID).pipe(
      switchMap(users => this.usuarioService.resolveProfilePhotos(users))
    ).subscribe(data => {
    this.usuariosArray = data;
    this.isLoading = false;
    });

    if(this.afAuth.auth.currentUser != null){
      this.entrarSair = true;
      this.userId = this.afAuth.auth.currentUser.uid;
    } else this.entrarSair = false;
  }

  ngOnDestroy(){
    this.usuariosSubscription.unsubscribe();
    this.serveIDSubscription.unsubscribe();
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
