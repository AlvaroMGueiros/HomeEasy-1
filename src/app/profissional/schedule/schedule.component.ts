import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ScheduleService, ProfessionalSchedule } from '../../Servicos/schedule.service';
import { LoginServiceService } from '../../Servicos/login-service.service';
import { getCurrentUser } from '../../shared/utils/session-user.utils';
import { resolveHttpErrorMessage } from '../../shared/utils/http-error.utils';

@Component({ standalone: false, selector: 'app-schedule', templateUrl: './schedule.component.html', styleUrls: ['./schedule.component.css'] })
export class ScheduleComponent implements OnInit {
  userId = getCurrentUser()?.id || getCurrentUser()?.uid || '';
  schedule: ProfessionalSchedule;
  isLoading = true; isSaving = false; error = ''; feedback = '';
  readonly weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  constructor(private schedules: ScheduleService, private login: LoginServiceService, private router: Router) {}
  ngOnInit() { void this.load(); }
  async load() {
    this.isLoading = true; this.error = '';
    try { this.schedule = await firstValueFrom(this.schedules.getOwnSchedule()); }
    catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível carregar a agenda. Crie seu perfil profissional antes de configurar os horários.'); }
    finally { this.isLoading = false; }
  }
  addPeriod() { if (this.schedule.periods.length < 42) this.schedule.periods.push({ weekday: 1, startTime: '08:00', endTime: '18:00' }); }
  addException() { if (this.schedule.exceptions.length < 120) this.schedule.exceptions.push({ date: '', isUnavailable: true }); }
  async save() {
    if (this.isSaving) return;
    if (this.schedule.periods.some(period => period.startTime >= period.endTime)) { this.error = 'O horário de término deve ser posterior ao início.'; return; }
    if (this.schedule.exceptions.some(exception => !exception.date || (!exception.isUnavailable && (!exception.startTime || !exception.endTime || exception.startTime >= exception.endTime)))) { this.error = 'Preencha a data e os horários válidos das exceções.'; return; }
    this.isSaving = true; this.error = ''; this.feedback = '';
    try {
      const periods = this.schedule.periods.map(({ weekday, startTime, endTime }) => ({ weekday, startTime, endTime }));
      const exceptions = this.schedule.exceptions.map(exception => {
        if (exception.isUnavailable) return { date: exception.date, isUnavailable: true };
        return { date: exception.date, isUnavailable: false, startTime: exception.startTime, endTime: exception.endTime };
      });
      this.schedule = await firstValueFrom(this.schedules.saveSchedule({ periods, exceptions })); this.feedback = 'Agenda atualizada.';
    } catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível salvar sua agenda.'); }
    finally { this.isSaving = false; }
  }
  async logout() { await this.login.sair(); await this.router.navigate(['/home']); }
}
