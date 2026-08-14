import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';

import { ContatoService } from '../Servicos/contato.service';
import { Mensagem } from './../Usuarios/mensagem';
import { LoginServiceService } from '../Servicos/login-service.service';
import { FeedbackType } from '../shared/action-feedback/action-feedback.component';


@Component({
  selector: 'app-contato',
  templateUrl: './contato.component.html',
  styleUrls: ['./contato.component.css']
})
export class ContatoComponent implements OnInit {
  mensagem : Mensagem = {};
  entrarSair : boolean;
  userId : string;
  feedbackMessage = '';
  feedbackType: FeedbackType = 'info';
  isSubmitting = false;

  constructor(
    public contatoServico : ContatoService, 
    public afAuth : AngularFireAuth, 
    public loginService : LoginServiceService,
    public router : Router
    ) { }

  ngOnInit() {
    if(this.afAuth.auth.currentUser != null){
      this.entrarSair = true;
      this.userId = this.afAuth.auth.currentUser.uid;
    }else this.entrarSair = false;
  }
  async sendMessage(contactForm: NgForm){
    if (this.isSubmitting) {
      return;
    }

    this.feedbackMessage = '';
    this.isSubmitting = true;

    try {
      await this.contatoServico.salvarmensagem(this.mensagem);
      this.feedbackType = 'success';
      this.feedbackMessage = 'Mensagem enviada. Nossa equipe responderá pelo canal informado.';
      this.mensagem = {};
      contactForm.resetForm();
    } catch (error) {
      this.feedbackType = 'error';
      this.feedbackMessage = 'Não foi possível enviar sua mensagem. Verifique sua conexão e tente novamente.';
    } finally {
      this.isSubmitting = false;
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
