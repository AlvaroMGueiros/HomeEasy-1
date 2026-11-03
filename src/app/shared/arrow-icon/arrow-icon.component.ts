import { Component, Input } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-arrow-icon',
  templateUrl: './arrow-icon.component.html',
  styleUrls: ['./arrow-icon.component.css']
})
export class ArrowIconComponent {
  @Input() direction: 'right' | 'left' | 'external' | 'chevron' = 'right';
}
