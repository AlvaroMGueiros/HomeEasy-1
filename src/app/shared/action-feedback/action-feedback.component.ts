import { Component, Input } from '@angular/core';

export type FeedbackType = 'error' | 'info' | 'success';

@Component({
  selector: 'app-action-feedback',
  templateUrl: './action-feedback.component.html',
  styleUrls: ['./action-feedback.component.css']
})
export class ActionFeedbackComponent {
  @Input() message = '';
  @Input() type: FeedbackType = 'info';

  get isError(): boolean {
    return this.type === 'error';
  }

  get isSuccess(): boolean {
    return this.type === 'success';
  }

  get icon(): string {
    if (this.isError) {
      return '!';
    }

    if (this.isSuccess) {
      return '✓';
    }

    return 'i';
  }
}
