import { getCurrentUser } from '../../shared/utils/session-user.utils';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { LoginServiceService } from '../../Servicos/login-service.service';
import { UsuarioService } from '../../Servicos/usuario.service';
import { ServicoPedidoService } from './../../Servicos/servico-pedido.service';
import { ServicosService } from '../../Servicos/servicos.service';
import { ProviderStatusService } from '../../Servicos/provider-status.service';
import { Usuario } from './../../Usuarios/usuario';
import { Servico } from './../../Usuarios/servico';
import { ServicoPedido } from './../../Usuarios/serico-pedido';
import { NotificationService } from '../../shared/notification/notification.service';
import { resolveHttpErrorMessage } from '../../shared/utils/http-error.utils';

@Component({
  standalone: false,
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
 readonly weekdays = [
   { value: 'monday', label: 'Segunda' }, { value: 'tuesday', label: 'Terça' },
   { value: 'wednesday', label: 'Quarta' }, { value: 'thursday', label: 'Quinta' },
   { value: 'friday', label: 'Sexta' }, { value: 'saturday', label: 'Sábado' },
   { value: 'sunday', label: 'Domingo' }
 ];

  constructor( 
    public servico : ServicosService, 
    public loginService : LoginServiceService,
    public usuarioService : UsuarioService,
    public servicoPedido : ServicoPedidoService,
    public router : Router,
    private notificationService: NotificationService,
    private providerStatus: ProviderStatusService
  ) { }

  ngOnInit() {
    if(getCurrentUser() != null){
      this.entrarSair = true;
      this.userId = getCurrentUser().uid;
    } else this.entrarSair = false;

    this.userSubscription = this.usuarioService.getUsuario(this.userId).subscribe(data => {
      this.usuario = data; 
    });

    this.servicosSubscription = this.servico.getServicos().subscribe(data => {
      this.servicosArray = data;
    });
  }
  ngOnDestroy(){
    if(getCurrentUser() != null){
      this.userSubscription?.unsubscribe();
      this.servicosSubscription?.unsubscribe();
    }
  }
  async sair(){
    try{
      await this.loginService.sair().then(
        (success) => {this.router.navigate(["/home"])});
     } catch (error) {
       return;
    }
  }
  async inscreverServico(){
    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.servePedido.id = this.servicoSelecionado.id;
    try {
      await this.servicoPedido.addServicoPedido(this.usuario, this.servicoSelecionado, this.servePedido);
      this.notificationService.showSuccess('Serviço cadastrado', 'Sua especialidade já está disponível para novos clientes.');
      this.providerStatus.invalidate();
      this.router.navigate(['/inicio']);
    } catch (error) {
      this.notificationService.showError(
        'Não foi possível cadastrar',
        resolveHttpErrorMessage(error, 'Verifique os dados e tente publicar o serviço novamente.')
      );
    } finally {
      this.isSubmitting = false;
    }
  }

  toggleWeekday(weekday: string, checked: boolean) {
    const availableWeekdays = this.servePedido.availableWeekdays || [];
    const weekdayIndex = availableWeekdays.indexOf(weekday);
    if (checked && weekdayIndex === -1) {
      availableWeekdays.push(weekday);
    }
    if (!checked && weekdayIndex !== -1) {
      availableWeekdays.splice(weekdayIndex, 1);
    }
    this.servePedido.availableWeekdays = availableWeekdays;
  }

  get hasRequiredProfessionalProfile() {
    return Boolean(this.usuario.telefone && this.usuario.cidade && this.usuario.estado);
  }
}
