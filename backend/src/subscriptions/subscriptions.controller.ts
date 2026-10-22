import { Body, Controller, Get, Header, Headers, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { AuthenticatedUser } from '../auth/authenticated-user.decorator';
import { Public } from '../auth/public.decorator';
import { PublicUser } from '../shared/utils/public-user.utils';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}
  @Public() @Get('terms') @Header('Content-Type', 'text/html; charset=utf-8')
  terms() {
    return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Termos HomeEasy+</title></head><body><main><h1>Termos do HomeEasy+</h1><p>Plano opcional para profissionais: até 12 publicações não arquivadas e 60 fotos no portfólio. As publicações passam por moderação. O plano não garante contratações, posição no feed ou identidade verificada.</p><p>O preço, a moeda e a periodicidade mensal são apresentados pela Google Play antes da confirmação. A renovação é automática. Gerencie ou cancele em <a href="https://play.google.com/store/account/subscriptions">Assinaturas da Google Play</a>. O cancelamento interrompe renovações futuras; o acesso permanece até a data confirmada pela loja. Reembolsos seguem as regras da loja e os direitos aplicáveis.</p><p>Ao expirar, o plano volta aos limites gratuitos de 4 publicações e 30 fotos. Conteúdo existente não é apagado automaticamente, mas novas inclusões exigem respeitar o limite. Excluir a conta HomeEasy não cancela a assinatura na Google Play.</p><p>Em caso de problemas com o acesso, utilize o suporte do aplicativo. Nunca envie dados de cartão ou senhas nas mensagens.</p></main></body></html>';
  }
  @UseGuards(ThrottlerGuard) @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get('me') findOwn(@AuthenticatedUser() user: PublicUser) { return this.subscriptions.findOwn(user.id); }
  @UseGuards(ThrottlerGuard) @Throttle({ default: { limit: 6, ttl: 60000 } })
  @Post('sync') @HttpCode(200) sync(@AuthenticatedUser() user: PublicUser) { return this.subscriptions.reconcile(user.id); }
  @Public() @Post('revenuecat/webhook') @HttpCode(200)
  webhook(@Headers('authorization') authorization = '', @Body() body: unknown) { return this.subscriptions.receiveWebhook(authorization, body); }
}
