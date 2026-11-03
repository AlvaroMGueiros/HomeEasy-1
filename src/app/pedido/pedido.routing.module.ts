import { NgModule } from "@angular/core";
import { Routes, RouterModule } from '@angular/router';

import { PedidoComponent } from './pedido.component';
import { PedidoInfoComponent } from './pedido-info/pedido-info.component';
import { PedidoFeitoComponent } from './pedido-feito/pedido-feito.component';
import { PedidoRecebidoComponent } from './pedido-recebido/pedido-recebido.component';
import { PedidoFeitoDetalheComponent } from './pedido-feito-detalhe/pedido-feito-detalhe.component';
import { PedidoRecebidoDetalheComponent } from './pedido-recebido-detalhe/pedido-recebido-detalhe.component';
import { AuthGuardGuard } from "../guardas/auth-guard.guard";
import { ServiceOpportunityDetailComponent } from './service-opportunity-detail/service-opportunity-detail.component';
import { ServiceOpportunityListComponent } from './service-opportunity-list/service-opportunity-list.component';
import { ServiceRequestDetailComponent } from './service-request-detail/service-request-detail.component';
import { ServiceRequestFormComponent } from './service-request-form/service-request-form.component';
import { ServiceRequestListComponent } from './service-request-list/service-request-list.component';
import { OrderDetailComponent } from './order-detail/order-detail.component';
import { OrdersComponent } from './orders/orders.component';

const pedidoRoutes : Routes = [
    {path: 'meus-servicos', component: OrdersComponent, canActivate: [AuthGuardGuard]},
    {path: 'atendimentos/:orderId', component: OrderDetailComponent, canActivate: [AuthGuardGuard]},
    {path : 'serviço/:id/usuario/:idd/pedido', redirectTo : 'solicitar/:id/profissional/:idd', pathMatch : 'full' },
    {path : 'pedido-info', component : PedidoInfoComponent },
    {path : 'usuario/:id/pedidos-feitos', component : PedidoFeitoComponent, canActivate : [AuthGuardGuard] },
    {path : 'usuario/:id/pedidos-feitos/:idd', component : OrderDetailComponent, canActivate : [AuthGuardGuard] },
    {path : 'usuario/:id/pedidos-recebidos', component : PedidoRecebidoComponent, canActivate : [AuthGuardGuard] },
    {path : 'usuario/:id/pedidos-recebidos/:idd', component : OrderDetailComponent, canActivate : [AuthGuardGuard] },
    {path : 'solicitar/:serviceId/profissional/:professionalId', component : ServiceRequestFormComponent, canActivate : [AuthGuardGuard] },
    {path : 'solicitar/:serviceId', component : ServiceRequestFormComponent, canActivate : [AuthGuardGuard] },
    {path : 'solicitacoes', component : ServiceRequestListComponent, canActivate : [AuthGuardGuard] },
    {path : 'solicitacoes/:requestId', component : ServiceRequestDetailComponent, canActivate : [AuthGuardGuard] },
    {path : 'oportunidades', component : ServiceOpportunityListComponent, canActivate : [AuthGuardGuard] },
    {path : 'oportunidades/:requestId', component : ServiceOpportunityDetailComponent, canActivate : [AuthGuardGuard] },
];

@NgModule({
    imports:[
        RouterModule.forChild(pedidoRoutes)
    ],
    exports:[
        RouterModule
    ]
})

export class PedidoRoutingModule {}
