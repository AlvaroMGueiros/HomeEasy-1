import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from '@angular/forms';

import { PedidoComponent } from './pedido.component';
import { PedidoInfoComponent } from './pedido-info/pedido-info.component';
import { PedidoRoutingModule } from './pedido.routing.module';
import { PedidoFeitoComponent } from './pedido-feito/pedido-feito.component';
import { PedidoFeitoDetalheComponent } from './pedido-feito-detalhe/pedido-feito-detalhe.component';
import { PedidoRecebidoComponent } from './pedido-recebido/pedido-recebido.component';
import { PedidoRecebidoDetalheComponent } from './pedido-recebido-detalhe/pedido-recebido-detalhe.component';
import { SharedModule } from '../shared/shared.module';

@NgModule({
    imports:[
        CommonModule,
        FormsModule, 
        PedidoRoutingModule,
        SharedModule
    ],
    declarations:[
        PedidoComponent,
        PedidoInfoComponent,
        PedidoFeitoComponent,
        PedidoRecebidoComponent,
        PedidoFeitoDetalheComponent,
        PedidoRecebidoDetalheComponent
    ], 
    exports:[

    ],
    providers:[]
})

export class PedidoModule {}
