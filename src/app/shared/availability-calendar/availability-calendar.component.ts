import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { from, of, Subscription } from 'rxjs';
import { catchError, map, mergeMap, toArray } from 'rxjs/operators';
import { ProfessionalSchedule, ScheduleService } from '../../Servicos/schedule.service';
import { ProfessionalProfile, ProfessionalService } from '../models/professional-profile';
import { CalendarDay, getCalendarDays, getFutureScheduleInstant, getScheduledTimes } from '../utils/availability-calendar.utils';

interface CalendarSlot { time: string; isAvailable: boolean; }

@Component({ standalone: false, selector: 'app-availability-calendar', templateUrl: './availability-calendar.component.html', styleUrls: ['./availability-calendar.component.css'] })
export class AvailabilityCalendarComponent implements OnChanges, OnDestroy {
  @Input() profile: ProfessionalProfile;
  @Input() schedule: ProfessionalSchedule;
  @Input() canRequest = true;
  days: CalendarDay[] = [];
  slots: CalendarSlot[] = [];
  services: ProfessionalService[] = [];
  selectedDate = '';
  selectedTime = '';
  serviceId = '';
  weekOffset = 0;
  isLoading = false;
  error = '';
  private availabilitySubscription: Subscription;
  readonly timeGroups = [ { label: 'Manhã', start: 0, end: 12 }, { label: 'Tarde', start: 12, end: 18 }, { label: 'Noite', start: 18, end: 24 } ];

  constructor(private schedules: ScheduleService) {}

  ngOnChanges() {
    this.services = (this.profile?.services || []).filter(service => service.isActive);
    this.serviceId = this.services[0]?.id || '';
    this.weekOffset = 0;
    this.days = getCalendarDays(0);
    this.selectDay(this.days[0].date);
  }

  ngOnDestroy() { this.availabilitySubscription?.unsubscribe(); }
  get monthLabel() { return new Date(this.days[0]?.date + 'T12:00:00Z').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }); }
  get selectedDateLabel() { return new Date(this.selectedDate + 'T12:00:00Z').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }); }
  get hasSchedule() { return Boolean(this.schedule?.periods.length || this.schedule?.exceptions.length); }
  get requestParams() { return { preferredDate: this.selectedDate, preferredTime: this.selectedTime }; }

  changeWeek(direction: number) {
    this.weekOffset = Math.max(0, Math.min(84, this.weekOffset + direction * 7));
    this.days = getCalendarDays(this.weekOffset);
    this.selectDay(this.days[0].date);
  }

  selectDay(date: string) {
    this.availabilitySubscription?.unsubscribe();
    this.selectedDate = date; this.selectedTime = ''; this.slots = []; this.error = ''; this.isLoading = false;
    if (!this.schedule || !this.profile?.isAvailable) return;
    const times = getScheduledTimes(this.schedule, date);
    if (!times.length) return;
    this.isLoading = true;
    this.availabilitySubscription = from(times).pipe(
      mergeMap(time => this.schedules.findAvailability(this.profile.id, getFutureScheduleInstant(date, time), 60).pipe(
        map(result => ({ time, isAvailable: result.isAvailable })),
        catchError(() => { this.error = 'Alguns horários não puderam ser consultados. Tente novamente.'; return of({ time, isAvailable: false }); })
      ), 4), toArray()
    ).subscribe(slots => { this.slots = slots.sort((first, second) => first.time.localeCompare(second.time)); this.isLoading = false; });
  }

  slotsForGroup(start: number, end: number) { return this.slots.filter(slot => Number(slot.time.slice(0, 2)) >= start && Number(slot.time.slice(0, 2)) < end); }
}
