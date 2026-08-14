import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from '@angular/forms';

import { LoginCadastroComponent } from "./login-cadastro.component";
import { RecuperarSenhaComponent } from './recuperar-senha/recuperar-senha.component';
import { LoginServiceService } from '../Servicos/login-service.service';
import { LoginRoutingModule } from './login.routing.module';
import { SharedModule } from '../shared/shared.module';

@NgModule({
    imports:[
        CommonModule,
        FormsModule, 
        LoginRoutingModule,
        SharedModule
    ],
    declarations:[
        LoginCadastroComponent,
        RecuperarSenhaComponent
    ], 
    exports:[

    ],
    providers:[LoginServiceService]
})

export class LoginModule {}
