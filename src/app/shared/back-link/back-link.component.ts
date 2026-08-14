import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-back-link',
  templateUrl: './back-link.component.html',
  styleUrls: ['./back-link.component.css']
})
export class BackLinkComponent {
  @Input() route: any[] | string = '/home';
  @Input() label = 'Voltar';
}
