import { AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnDestroy, Output, ViewChild } from '@angular/core';
import { GoogleIdentityService } from '../../Servicos/google-identity.service';
import { environment } from '../../../environments/environment';

@Component({ standalone: false, selector: 'app-google-auth-button', templateUrl: './google-auth-button.component.html', styleUrls: ['./google-auth-button.component.css'] })
export class GoogleAuthButtonComponent implements AfterViewInit, OnDestroy {
  @Input() disabled = false;
  @Output() credential = new EventEmitter<string>();
  @Output() failure = new EventEmitter<string>();
  @ViewChild('googleButton') container: ElementRef<HTMLElement>;
  private active = true;
  readonly configured = Boolean(environment.googleWebClientId);
  constructor(private identity: GoogleIdentityService, private zone: NgZone) {}
  ngAfterViewInit() { if (this.configured) void this.render(); }
  ngOnDestroy() { this.active = false; }
  private async render() {
    try {
      const google = await this.identity.load();
      if (!this.active) return;
      google.accounts.id.initialize({ client_id: environment.googleWebClientId, auto_select: false, callback: response => {
        if (this.active && !this.disabled && response.credential) this.zone.run(() => this.credential.emit(response.credential));
      } });
      google.accounts.id.renderButton(this.container.nativeElement, { theme: 'outline', size: 'large', text: 'continue_with', locale: 'pt-BR' });
    } catch (failure) { if (this.active) this.zone.run(() => this.failure.emit(failure instanceof Error ? failure.message : 'Não foi possível iniciar o login Google.')); }
  }
}
