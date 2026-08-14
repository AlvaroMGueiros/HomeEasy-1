import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from '@angular/forms';

import { FeedComponent } from './feed.component';
import { FeedRoutingModule } from "./feed.routing.module";
import { ServicoDetalheComponent } from './servico-detalhe/servico-detalhe.component';
import { ProcurarServicoComponent } from './procurar-servico/procurar-servico.component';
import { SharedModule } from '../shared/shared.module';
import { FloatingChatComponent } from './floating-chat/floating-chat.component';
import { RegionalServiceMapComponent } from './regional-service-map/regional-service-map.component';

@NgModule({
    imports:[
        CommonModule,
        FormsModule, 
        FeedRoutingModule,
        SharedModule
    ],
    declarations:[
        FeedComponent, 
        ServicoDetalheComponent,
        ProcurarServicoComponent,
        FloatingChatComponent,
        RegionalServiceMapComponent
    ], 
    exports:[

    ],
    providers:[]
})

export class FeedModule {}
