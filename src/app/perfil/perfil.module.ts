import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from '@angular/forms';

import { PerfilComponent } from './perfil.component';
import { PerfilRoutingModule } from './perfil.routing.module';
import { EditarInfoComponent } from './editar-info/editar-info.component';
import { PerfilPedidoComponent } from './perfil-pedido/perfil-pedido.component';
import { AvaliacoesComponent } from './avaliacoes/avaliacoes.component';
import { SharedModule } from '../shared/shared.module';
import { FavoritosComponent } from './favoritos/favoritos.component';
import { NotificationsComponent } from './notifications/notifications.component';
import { NotificationPreferencesComponent } from './notification-preferences/notification-preferences.component';
import { DeleteAccountComponent } from './delete-account/delete-account.component';

@NgModule({
    imports:[
        CommonModule,
        FormsModule, 
        PerfilRoutingModule,
        SharedModule
    ],
    declarations:[
        NotificationsComponent,
        NotificationPreferencesComponent,
        DeleteAccountComponent,
        PerfilComponent,
        EditarInfoComponent,
        PerfilPedidoComponent,
        AvaliacoesComponent,
        FavoritosComponent
    ], 
    exports:[

    ],
    providers:[]
})

export class PerfilModule {}
