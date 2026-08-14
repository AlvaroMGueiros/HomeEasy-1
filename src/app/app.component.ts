import { Component, Inject, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import { colors } from './shared/colors';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'app';

  constructor(
    private router : Router,
    @Inject(DOCUMENT) private document : Document
  ){

  }
  ngOnInit(){
    const rootStyle = this.document.documentElement.style;
    Object.keys(colors).forEach(colorName => {
      rootStyle.setProperty(`--color-${colorName}`, colors[colorName]);
    });
  }
  navegar(){
    this.router.navigate(['/Login']);
  }
}
