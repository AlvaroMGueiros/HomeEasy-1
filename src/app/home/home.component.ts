import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router } from '@angular/router';

import { LoginServiceService } from '../Servicos/login-service.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  authenticated = false;
  userId: string;

  constructor(
    private afAuth: AngularFireAuth,
    private loginService: LoginServiceService,
    private router: Router
  ) { }

  ngOnInit() {
    const currentUser = this.afAuth.auth.currentUser;

    if (currentUser) {
      this.authenticated = true;
      this.userId = currentUser.uid;
    }
  }

  async logout() {
    await this.loginService.sair();
    this.authenticated = false;
    this.userId = null;
    this.router.navigate(['/home']);
  }
}
