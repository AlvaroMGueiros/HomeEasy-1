import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from '@angular/forms';

import { ChatComponent } from './chat.component';
import { ListaContatoComponent } from './lista-contato/lista-contato.component';
import { ChatRoutingModule } from './chat.routing.module';
import { SharedModule } from '../shared/shared.module';

@NgModule({
    imports:[
        CommonModule,
        FormsModule, 
        ChatRoutingModule,
        SharedModule
    ],
    declarations:[
        ChatComponent,
        ListaContatoComponent,
    ], 
    exports:[

    ],
    providers:[]
})

export class ChatModule {}
