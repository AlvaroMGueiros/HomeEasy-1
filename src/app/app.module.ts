import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { LOCALE_ID, NgModule } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app.routing.module';
import { HomeComponent } from './home/home.component';
import { ContatoComponent } from './contato/contato.component';
import { SobreModule } from './sobre-nos/sobre.module';
import { LoginServiceService } from './Servicos/login-service.service';
import { LoginModule } from './login-cadastro/login.module';
import { ContatoService } from './Servicos/contato.service';
import { FeedModule } from './feed/feed.module';
import { PerfilModule } from './perfil/perfil.module';
import { ServicosService } from './Servicos/servicos.service';
import { UsuarioService } from './Servicos/usuario.service';
import { ProfissionalModule } from './profissional/profissional.module';
import { PedidoModule } from './pedido/pedido.module';
import { ChatModule } from './chat/chat.module';
import { ChatService } from './Servicos/chat.service';
import { ServicoModule } from './servico/servico.module';
import { AvalicaoService } from './Servicos/avaliacao.service';
import { SharedModule } from './shared/shared.module';
import { AdminModule } from './admin/admin.module';
import { ApiAuthInterceptor } from './Servicos/api-auth.interceptor';
import { HighlightsModule } from './highlights/highlights.module';

registerLocaleData(localePt);

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    ContatoComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    SobreModule,
    LoginModule,
    FeedModule,
    PerfilModule,
    ProfissionalModule,
    PedidoModule,
    ChatModule,
    ServicoModule,
    SharedModule,
    AdminModule,
    HighlightsModule,
    AppRoutingModule
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    LoginServiceService,
    ContatoService,
    ServicosService,
    UsuarioService,
    ChatService,
    AvalicaoService,
    { provide: HTTP_INTERCEPTORS, useClass: ApiAuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
