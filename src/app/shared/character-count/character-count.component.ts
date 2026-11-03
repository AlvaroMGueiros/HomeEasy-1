import { Component, Input } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-character-count',
  templateUrl: './character-count.component.html',
  styleUrls: ['./character-count.component.css']
})
export class CharacterCountComponent {
  @Input() value: string | null | undefined = '';
  @Input() minimum = 0;
  @Input() maximum = 0;
  @Input() hintId = '';

  get characterCount() { return (this.value || '').trim().length; }
  get belowMinimum() { return this.characterCount > 0 && this.characterCount < this.minimum; }
}
