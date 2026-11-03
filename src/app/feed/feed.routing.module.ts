import { NgModule } from "@angular/core";
import { Routes, RouterModule } from '@angular/router';

import { FeedComponent } from './feed.component';
import { ServicoDetalheComponent } from './servico-detalhe/servico-detalhe.component';
import { ProcurarServicoComponent } from './procurar-servico/procurar-servico.component';
import { RegionalProfessionalsComponent } from './regional-professionals/regional-professionals.component';

const feedRoutes : Routes = [
    {path: 'profissionais/regiao', component: RegionalProfessionalsComponent},
    {path : 'feed', component : FeedComponent },
    {path : 'serviço/:id', component : ServicoDetalheComponent},
    {path : 'procurar/:nome', component : ProcurarServicoComponent}
];

@NgModule({
    imports:[
        RouterModule.forChild(feedRoutes)
    ],
    exports:[
        RouterModule
    ]
})

export class FeedRoutingModule {}
