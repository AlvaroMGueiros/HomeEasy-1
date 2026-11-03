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
import { ServiceOpportunityDetailComponent } from './service-opportunity-detail/service-opportunity-detail.component';
import { ServiceOpportunityListComponent } from './service-opportunity-list/service-opportunity-list.component';
import { ServiceRequestDetailComponent } from './service-request-detail/service-request-detail.component';
import { ServiceRequestFormComponent } from './service-request-form/service-request-form.component';
import { ServiceRequestListComponent } from './service-request-list/service-request-list.component';
import { OrderDetailComponent } from './order-detail/order-detail.component';
import { OrdersComponent } from './orders/orders.component';

@NgModule({
    imports:[
        CommonModule,
        FormsModule, 
        PedidoRoutingModule,
        SharedModule
    ],
    declarations:[
        OrderDetailComponent,
        OrdersComponent,
        PedidoComponent,
        PedidoInfoComponent,
        PedidoFeitoComponent,
        PedidoRecebidoComponent,
        PedidoFeitoDetalheComponent,
        PedidoRecebidoDetalheComponent,
        ServiceOpportunityDetailComponent,
        ServiceOpportunityListComponent,
        ServiceRequestDetailComponent,
        ServiceRequestFormComponent,
        ServiceRequestListComponent
    ], 
    exports:[

    ],
    providers:[]
})

export class PedidoModule {}
