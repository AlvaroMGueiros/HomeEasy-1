import { Component, OnDestroy, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { BrazilCity, BrazilLocationService, BrazilState } from '../../Servicos/brazil-location.service';
import { LoginServiceService } from '../../Servicos/login-service.service';
import { ServicosService } from '../../Servicos/servicos.service';
import { UsuarioService } from '../../Servicos/usuario.service';
import { Servico } from '../../Usuarios/servico';
import { Usuario } from '../../Usuarios/usuario';
import { formatCnpj, formatCpf, formatPhone, removeInputMask } from '../../shared/utils/input-mask.utils';
import { NotificationService } from '../../shared/notification/notification.service';

@Component({
  selector: 'app-editar-info',
  templateUrl: './editar-info.component.html',
  styleUrls: ['./editar-info.component.css']
})
export class EditarInfoComponent implements OnInit, OnDestroy {
  userId: string;
  entrarSair: boolean;
  usuario: Usuario = {};
  userSubscription: Subscription;
  servicosArray = new Array<Servico>();
  servicosSubscription: Subscription;
  statesSubscription: Subscription;
  citiesSubscription: Subscription;
  states = new Array<BrazilState>();
  cities = new Array<BrazilCity>();
  usesCpf = true;
  phoneInput = '';
  cpfInput = '';
  cnpjInput = '';
  isStatesLoading = true;
  isCitiesLoading = false;
  locationFeedback = '';
  isSavingProfile = false;

  constructor(
    public afAuth: AngularFireAuth,
    public afs: AngularFirestore,
    public router: Router,
    public usuarioService: UsuarioService,
    public servico: ServicosService,
    public loginService: LoginServiceService,
    private brazilLocationService: BrazilLocationService,
    private notificationService: NotificationService
  ) { }

  ngOnInit() {
    if (this.afAuth.auth.currentUser != null) {
      this.userId = this.afAuth.auth.currentUser.uid;
      this.entrarSair = true;
    } else {
      this.entrarSair = false;
    }

    this.loadStates();
    this.userSubscription = this.usuarioService.getUsuario(this.userId).subscribe(user => {
      this.usuario = user || {};
      this.usesCpf = !this.usuario.cnpj;
      this.syncMaskedInputs();
      this.restoreLocationSelection();
    });
    this.servicosSubscription = this.servico.getUserServico(this.userId).subscribe(services => {
      this.servicosArray = services;
    });
  }

  ngOnDestroy() {
    this.unsubscribe(this.userSubscription);
    this.unsubscribe(this.servicosSubscription);
    this.unsubscribe(this.statesSubscription);
    this.unsubscribe(this.citiesSubscription);
  }

  updatePhone(value: string) {
    this.phoneInput = formatPhone(value);
    this.usuario.telefone = removeInputMask(value, 11);
  }

  updateCpf(value: string) {
    this.cpfInput = formatCpf(value);
    this.usuario.cpf = removeInputMask(value, 11);
  }

  updateCnpj(value: string) {
    this.cnpjInput = formatCnpj(value);
    this.usuario.cnpj = removeInputMask(value, 14);
  }

  selectState(stateName: string) {
    this.usuario.estado = stateName;
    this.usuario.cidade = '';
    this.cities = new Array<BrazilCity>();
    this.locationFeedback = '';

    const selectedState = this.findState(stateName);
    if (selectedState) {
      this.loadCities(selectedState.sigla);
    }
  }

  async editarInfo() {
    if (this.isSavingProfile) {
      return;
    }

    this.isSavingProfile = true;
    this.usuario.id = this.userId;
    const writeOperations = new Array<Promise<void>>();
    writeOperations.push(this.afs.collection('Usuarios').doc(this.userId).set(this.usuario));

    for (let serviceIndex = 0; serviceIndex < this.servicosArray.length; serviceIndex++) {
      const service = this.servicosArray[serviceIndex];
      writeOperations.push(this.afs.collection('Serviços').doc(service.id).collection('Usuarios').doc(this.userId).set(this.usuario));
    }

    try {
      await Promise.all(writeOperations);
      this.notificationService.showSuccess('Perfil atualizado', 'Suas informações foram salvas com sucesso.');
    } catch (error) {
      this.notificationService.showError('Não foi possível salvar', 'Verifique sua conexão e tente atualizar o perfil novamente.');
    } finally {
      this.isSavingProfile = false;
    }
  }

  async sair() {
    try {
      await this.loginService.sair();
      this.router.navigate(['/home']);
    } catch (error) {
      return;
    }
  }

  private loadStates() {
    this.isStatesLoading = true;
    this.statesSubscription = this.brazilLocationService.getStates().subscribe(states => {
      this.states = states;
      this.isStatesLoading = false;
      this.restoreLocationSelection();
    }, () => {
      this.isStatesLoading = false;
      this.locationFeedback = 'Não foi possível carregar os estados. Tente novamente em instantes.';
    });
  }

  private restoreLocationSelection() {
    if (!this.usuario.estado || this.states.length === 0) {
      return;
    }

    const selectedState = this.findState(this.usuario.estado);
    if (!selectedState) {
      return;
    }

    const selectedCity = this.usuario.cidade;
    this.usuario.estado = selectedState.nome;
    this.loadCities(selectedState.sigla, selectedCity);
  }

  private loadCities(stateCode: string, selectedCity?: string) {
    this.unsubscribe(this.citiesSubscription);
    this.isCitiesLoading = true;
    this.locationFeedback = '';
    this.citiesSubscription = this.brazilLocationService.getCities(stateCode).subscribe(cities => {
      this.cities = cities;
      this.isCitiesLoading = false;
      if (selectedCity) {
        this.usuario.cidade = selectedCity;
      }
    }, () => {
      this.isCitiesLoading = false;
      this.locationFeedback = 'Não foi possível carregar as cidades deste estado. Tente novamente.';
    });
  }

  private findState(stateValue: string): BrazilState {
    return this.states.find(state => state.nome === stateValue || state.sigla === stateValue);
  }

  private syncMaskedInputs() {
    this.phoneInput = formatPhone(this.usuario.telefone);
    this.cpfInput = formatCpf(this.usuario.cpf);
    this.cnpjInput = formatCnpj(this.usuario.cnpj);
  }

  private unsubscribe(subscription: Subscription) {
    if (subscription) {
      subscription.unsubscribe();
    }
  }
}
