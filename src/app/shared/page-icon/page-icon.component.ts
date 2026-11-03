import { Component, Input } from '@angular/core';

export type PageIconName = 'calendar' | 'briefcase' | 'profile' | 'message' | 'star' | 'shield' | 'document' | 'bell' | 'search' | 'location' | 'heart' | 'settings' | 'plus' | 'trash' | 'check' | 'clock' | 'blocked' | 'chart';

const pageIconPaths: Record<PageIconName, string> = {
    calendar: 'M7 3v4m10-4v4M3 10h18M6 5h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3zM7 14h1m4 0h1m4 0h1M7 17h1m4 0h1',
    briefcase: 'M8 7V3h8v4M6 7h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3zM3 12a20 20 0 0 0 18 0M10 12h4v4h-4z',
    profile: 'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2',
    message: 'M21 14a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4zM7 8h10M7 12h6',
    star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z',
    shield: 'm12 2 8 3v6c0 5-4 9-8 11-4-2-8-6-8-11V5zM8 12l3 3 5-6',
    document: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8m-8 4h5',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
    search: 'M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0m-2 5.5 5 5',
    location: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0zM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z',
    settings: 'M3 6h3m4 0h11M3 12h11m4 0h3M3 18h4m4 0h10M6 4h4v4H6zM14 10h4v4h-4zM7 16h4v4H7z',
    plus: 'M12 5v14M5 12h14',
    trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
    check: 'm5 12 4 4L19 6',
    clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v5l3 2',
    blocked: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M6 6l12 12',
    chart: 'M3 3v18h18M7 15l4-5 4 2 6-7'
  };

@Component({
  standalone: false,
  selector: 'app-page-icon',
  templateUrl: './page-icon.component.html',
  styleUrls: ['./page-icon.component.css']
})
export class PageIconComponent {
  @Input() name: PageIconName = 'briefcase';
  readonly paths = pageIconPaths;
}
