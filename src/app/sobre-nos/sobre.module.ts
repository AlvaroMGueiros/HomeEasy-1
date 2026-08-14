import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { SobreRoutingModule } from './sobre.routing.module';
import { SobreNosComponent } from './sobre-nos.component';
import { SharedModule } from '../shared/shared.module';

@NgModule({
    imports:[
        CommonModule,
        SobreRoutingModule,
        SharedModule
    ],
    declarations:[
        SobreNosComponent
    ],
    exports:[]
})

export class SobreModule {}
