import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { buildBrandedMailHtml, buildBrandedMailText, MailDetail } from './mail-template.utils';

export interface MarketplaceMailDetails {
  orderId: string;
  serviceName: string;
  client: { id: string; name: string; email: string };
  professional: { id: string; name: string; email: string };
  agreedPrice: number;
  scheduledAt: Date | null;
  address: string;
  city: string;
  state: string;
}

@Injectable()
export class MailService {
  private readonly frontendBaseUrl: string;
  private readonly from: string;
  private readonly logoContent: string;
  private readonly resendApiKey: string;

  constructor(configService: ConfigService) {
    this.frontendBaseUrl = configService.getOrThrow<string>('FRONTEND_BASE_URL');
    this.from = configService.getOrThrow<string>('SMTP_FROM');
    this.resendApiKey = configService.get<string>('RESEND_API_KEY') || '';
    this.logoContent = readFileSync(
      resolve(process.cwd(), '../src/assets/home-easy-logo-v2.png')
    ).toString('base64');
  }

  async sendPasswordReset(email: string, rawToken: string) {
    const resetUrl = `${this.frontendBaseUrl}/redefinir-senha?token=${encodeURIComponent(rawToken)}`;
    await this.sendMail({
      to: email,
      subject: 'Redefina sua senha do Home Easy',
      text: `Use este link para redefinir sua senha. Ele expira em 30 minutos: ${resetUrl}`,
      html: `<p>Recebemos uma solicitação para redefinir sua senha.</p><p><a href="${resetUrl}">Criar uma nova senha</a></p><p>O link expira em 30 minutos.</p>`
    });
  }

  async sendProposalAccepted(details: MarketplaceMailDetails) {
    const commonDetails = this.buildOrderDetails(details);
    await Promise.all([
      this.sendBrandedMail({
        to: details.client.email,
        subject: `Contratação confirmada: ${details.serviceName}`,
        eyebrow: 'Serviço contratado',
        title: 'Tudo certo com a sua contratação',
        greeting: `Olá, ${details.client.name}!`,
        message: `${details.professional.name} recebeu a confirmação. Agora vocês podem combinar os detalhes do atendimento pela conversa da Home Easy.`,
        details: commonDetails,
        actionLabel: 'Acompanhar pedido',
        actionUrl: `${this.frontendBaseUrl}/usuario/${details.client.id}/pedidos-feitos/${details.orderId}`,
        footer: 'Você recebeu este e-mail porque contratou um serviço pela Home Easy.'
      }),
      this.sendBrandedMail({
        to: details.professional.email,
        subject: `Sua proposta foi aceita: ${details.serviceName}`,
        eyebrow: 'Nova contratação',
        title: 'Sua proposta foi aceita',
        greeting: `Olá, ${details.professional.name}!`,
        message: `${details.client.name} escolheu sua proposta. Abra o pedido para conferir as informações e alinhar o atendimento pelo chat.`,
        details: commonDetails,
        actionLabel: 'Ver pedido recebido',
        actionUrl: `${this.frontendBaseUrl}/usuario/${details.professional.id}/pedidos-recebidos/${details.orderId}`,
        footer: 'Este e-mail confirma uma contratação realizada pela Home Easy.'
      })
    ]);
  }

  async sendServiceCompleted(details: MarketplaceMailDetails) {
    const commonDetails = this.buildOrderDetails(details);
    await Promise.all([
      this.sendBrandedMail({
        to: details.client.email,
        subject: `Serviço concluído: ${details.serviceName}`,
        eyebrow: 'Atendimento concluído',
        title: 'Como foi a sua experiência?',
        greeting: `Olá, ${details.client.name}!`,
        message: `O atendimento com ${details.professional.name} foi marcado como concluído. Sua avaliação ajuda outras pessoas a contratar com mais confiança.`,
        details: commonDetails,
        actionLabel: 'Avaliar atendimento',
        actionUrl: `${this.frontendBaseUrl}/usuario/${details.client.id}/pedidos-feitos/${details.orderId}`,
        footer: 'Avaliações são liberadas somente para serviços concluídos na Home Easy.'
      }),
      this.sendBrandedMail({
        to: details.professional.email,
        subject: `Atendimento concluído: ${details.serviceName}`,
        eyebrow: 'Serviço finalizado',
        title: 'Mais um trabalho concluído',
        greeting: `Olá, ${details.professional.name}!`,
        message: `O serviço para ${details.client.name} foi concluído. O atendimento já está registrado no seu histórico profissional.`,
        details: commonDetails,
        actionLabel: 'Consultar pedido',
        actionUrl: `${this.frontendBaseUrl}/usuario/${details.professional.id}/pedidos-recebidos/${details.orderId}`,
        footer: 'Obrigado por oferecer seus serviços pela Home Easy.'
      })
    ]);
  }

  private buildOrderDetails(details: MarketplaceMailDetails): MailDetail[] {
    return [
      { label: 'Serviço', value: details.serviceName },
      { label: 'Profissional', value: details.professional.name },
      {
        label: 'Valor combinado',
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
          details.agreedPrice
        )
      },
      {
        label: 'Atendimento',
        value: details.scheduledAt
          ? new Intl.DateTimeFormat('pt-BR', {
              dateStyle: 'long',
              timeStyle: 'short',
              timeZone: 'America/Fortaleza'
            }).format(details.scheduledAt)
          : 'A combinar'
      },
      { label: 'Local', value: `${details.address}, ${details.city}/${details.state}` }
    ];
  }

  private sendBrandedMail(message: {
    to: string;
    subject: string;
    eyebrow: string;
    title: string;
    greeting: string;
    message: string;
    details: MailDetail[];
    actionLabel: string;
    actionUrl: string;
    footer: string;
  }) {
    const { to, subject, ...template } = message;
    return this.sendMail({
      to,
      subject,
      text: buildBrandedMailText(template),
      html: buildBrandedMailHtml(template),
      attachments: [
        {
          filename: 'home-easy-logo.png',
          content: this.logoContent,
          content_id: 'homeeasy-logo'
        }
      ]
    });
  }

  private async sendMail(message: {
    to: string;
    subject: string;
    text: string;
    html: string;
    attachments?: Array<{ filename: string; content: string; content_id: string }>;
  }) {
    if (!this.resendApiKey) {
      throw new Error('RESEND_API_KEY não foi configurada para o envio de e-mails.');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from: this.from, ...message })
    });

    if (!response.ok) {
      const responseBody = await response.text();
      throw new Error(`Resend recusou o envio do e-mail (${response.status}): ${responseBody}`);
    }
  }
}
