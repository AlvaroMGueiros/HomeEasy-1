import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/auth';

import { LoginServiceService } from '../../Servicos/login-service.service';
import { Usuario } from './../../Usuarios/usuario';
import { FeedbackType } from '../../shared/action-feedback/action-feedback.component';
import { resolveAuthErrorMessage } from '../../shared/utils/auth-error.utils';

@Component({
  selector: 'app-recuperar-senha',
  templateUrl: './recuperar-senha.component.html',
  styleUrls: ['./recuperar-senha.component.css']
})
export class RecuperarSenhaComponent implements OnInit {
  entrarSair : boolean;
  userId : string;
  userLogin : Usuario = {};
  feedbackMessage = '';
  feedbackType: FeedbackType = 'info';
  isSubmitting = false;

  constructor(
    public loginservico : LoginServiceService,
    public router : Router,
    public afAuth : AngularFireAuth,
  ) { }

  ngOnInit() {    
    if(this.afAuth.auth.currentUser != null){
      this.entrarSair = true;
      this.userId = this.afAuth.auth.currentUser.uid;
    }else this.entrarSair = false
  }

  async resetPassword(){
    if (this.isSubmitting) {
      return;
    }

    this.feedbackMessage = '';
    this.isSubmitting = true;

    try {
      await this.loginservico.recuperarsenha(this.userLogin);
      this.feedbackType = 'success';
      this.feedbackMessage = 'Enviamos o link de recuperação. Confira sua caixa de entrada e a pasta de spam.';
    } catch (error) {
      this.feedbackType = 'error';
      this.feedbackMessage = resolveAuthErrorMessage(error.code, 'recovery');
    } finally {
      this.isSubmitting = false;
    }
  }

  async sair(){
    try{
      await this.loginservico.sair().then(
        (success) => {this.router.navigate(["/home"])});
     }catch(error){
       console.error(error);
    }
  }

}
