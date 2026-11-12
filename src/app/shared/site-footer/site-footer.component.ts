import { Component } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-site-footer',
  templateUrl: './site-footer.component.html',
  styleUrls: ['./site-footer.component.css']
})
export class SiteFooterComponent {
  readonly year = new Date().getFullYear();
}
