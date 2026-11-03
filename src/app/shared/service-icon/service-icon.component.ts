import { Component, Input } from '@angular/core';

import { resolveServiceIcon, ServiceIconType } from '../utils/service-icon.utils';

@Component({
  standalone: false,
  selector: 'app-service-icon',
  templateUrl: './service-icon.component.html',
  styleUrls: ['./service-icon.component.css']
})
export class ServiceIconComponent {
  @Input() colorful = false;
  iconType: ServiceIconType = 'tools';

  @Input()
  set serviceName(serviceName: string) {
    this.iconType = resolveServiceIcon(serviceName);
  }
}
