import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, forkJoin, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { OrderStatus } from '../Usuarios/pedido';
import { OwnProposal, ServiceProposal, ServiceRequest } from '../shared/models/service-request';
import { MediaPurpose, MediaUploadService } from './media-upload.service';
import { CancellationReason } from '../shared/models/cancellation-reason';

interface ApiRequestAttachment {
  mediaId: string;
  fileName: string;
  contentType: string;
}

interface ApiServiceRequest extends Omit<ServiceRequest, 'answers' | 'attachments'> {
  service?: { id: string; name: string; category: string };
  preferredAt?: string;
  answers?: Record<string, string | number | boolean>;
  attachments?: ApiRequestAttachment[];
}

interface ApiProposal {
  id: string;
  price: number;
  message: string;
  estimatedDurationMinutes: number;
  materialsIncluded: boolean;
  travelFee: number;
  paymentMethods: string[];
  validUntil: string;
  status: ServiceProposal['status'];
  professional: {
    id: string;
    name: string;
    verificationStatus: string;
    metrics?: {
      averageRating: number;
      completedServices: number;
    };
  };
}

@Injectable({ providedIn: 'root' })
export class ServiceRequestService {
  getOwnProposals() { return this.http.get<OwnProposal[]>(`${environment.apiUrl}/marketplace/proposals/me`); }
  constructor(private http: HttpClient, private mediaUploadService: MediaUploadService) {}

  async createRequest(request: ServiceRequest, clientId: string) {
    if (!clientId) {
      throw new Error('Entre na sua conta para criar uma solicitação.');
    }
    const createdRequest = await firstValueFrom(
      this.http.post<ApiServiceRequest>(`${environment.apiUrl}/marketplace/requests`, {
        serviceId: request.serviceId,
        preferredProfessionalId: request.preferredProfessionalId,
        description: request.description,
        urgency: request.urgency,
        answers: this.toAnswerRecord(request),
        address: request.address,
        city: request.city,
        state: request.state,
        budgetMinimum: request.budgetMinimum,
        budgetMaximum: request.budgetMaximum,
        preferredAt: this.toPreferredAt(request)
      })
    );
    const attachments = request.attachments || [];
    for (const attachment of attachments) {
      const mediaId = await this.mediaUploadService.uploadDataUrl(
        attachment,
        MediaPurpose.RequestAttachment
      );
      await firstValueFrom(
        this.http.post(
          `${environment.apiUrl}/marketplace/requests/${createdRequest.id}/attachments/${mediaId}`,
          {}
        )
      );
    }
    return createdRequest.id;
  }

  getClientRequests(clientId: string) {
    return this.http
      .get<ApiServiceRequest[]>(`${environment.apiUrl}/marketplace/requests/me`)
      .pipe(map(requests => requests.map(request => this.toServiceRequest(request))));
  }

  getAvailableRequests(professionalId: string, serviceIds: string[], city: string, state: string) {
    return this.http
      .get<ApiServiceRequest[]>(`${environment.apiUrl}/marketplace/opportunities`)
      .pipe(map(requests => requests.map(request => this.toServiceRequest(request))));
  }

  getRequest(requestId: string) {
    return this.http
      .get<ApiServiceRequest>(`${environment.apiUrl}/marketplace/requests/${requestId}`)
      .pipe(
        map(request => this.toServiceRequest(request)),
        switchMap(request => this.resolveAttachmentUrls(request))
      );
  }

  getRequestProposals(requestId: string) {
    return this.http
      .get<ApiProposal[]>(`${environment.apiUrl}/marketplace/requests/${requestId}/proposals`)
      .pipe(map(proposals => proposals.map(proposal => this.toServiceProposal(proposal))));
  }

  submitProposal(requestId: string, proposal: ServiceProposal, professionalId: string) {
    if (!professionalId) {
      return Promise.reject(new Error('Entre na sua conta profissional para enviar uma proposta.'));
    }
    return firstValueFrom(
      this.http.post(`${environment.apiUrl}/marketplace/requests/${requestId}/proposals`, {
        price: proposal.price,
        message: proposal.message,
        estimatedDurationMinutes: proposal.estimatedDurationMinutes || this.parseDuration(proposal.estimatedDuration),
        materialsIncluded: Boolean(proposal.materialsIncluded),
        travelFee: proposal.travelFee || 0,
        paymentMethods: proposal.paymentMethods || []
      })
    );
  }

  acceptProposal(requestId: string, proposalId: string, clientId: string) {
    return firstValueFrom(
      this.http.post<{ id: string }>(
        `${environment.apiUrl}/marketplace/requests/${requestId}/proposals/${proposalId}/accept`,
        {}
      )
    );
  }

  cancelRequest(
    request: ServiceRequest,
    clientId: string,
    reason: CancellationReason,
    details?: string
  ) {
    return firstValueFrom(
      this.http.post(`${environment.apiUrl}/marketplace/requests/${request.id}/cancel`, {
        reason,
        details: details || undefined
      })
    );
  }

  private toAnswerRecord(request: ServiceRequest) {
    return (request.answers || []).reduce<Record<string, string | number | boolean>>(
      (answers, answer) => {
        answers[answer.key] = answer.value;
        return answers;
      },
      {}
    );
  }

  private toPreferredAt(request: ServiceRequest) {
    if (!request.preferredDate) {
      return undefined;
    }
    return new Date(`${request.preferredDate}T${request.preferredTime || '09:00'}:00-03:00`).toISOString();
  }

  private toServiceRequest(request: ApiServiceRequest): ServiceRequest {
    const preferredAt = request.preferredAt ? new Date(new Date(request.preferredAt).getTime() - 3 * 3600000) : null;
    return Object.assign({}, request, {
      serviceName: request.service?.name || request.serviceName,
      category: request.service?.category || request.category,
      preferredDate: preferredAt ? preferredAt.toISOString().slice(0, 10) : undefined,
      preferredTime: preferredAt ? preferredAt.toISOString().slice(11, 16) : undefined,
      answers: Object.entries(request.answers || {}).map(([key, value]) => ({ key, label: key, value })),
      attachments: (request.attachments || []).map(attachment => ({
        mediaId: attachment.mediaId,
        name: attachment.fileName,
        mimeType: attachment.contentType,
        dataUrl: ''
      })),
      status: request.status as OrderStatus
    });
  }

  private toServiceProposal(proposal: ApiProposal): ServiceProposal {
    return {
      id: proposal.id,
      professionalId: proposal.professional.id,
      professionalName: proposal.professional.name,
      professionalVerified: ['professional_verified', 'featured', 'verified'].includes(
        proposal.professional.verificationStatus
      ),
      professionalRating: proposal.professional.metrics?.averageRating,
      professionalCompletedServices: proposal.professional.metrics?.completedServices,
      price: proposal.price,
      message: proposal.message,
      estimatedDurationMinutes: proposal.estimatedDurationMinutes,
      estimatedDuration: `${proposal.estimatedDurationMinutes} minutos`,
      materialsIncluded: proposal.materialsIncluded,
      travelFee: proposal.travelFee,
      paymentMethods: proposal.paymentMethods,
      validUntil: proposal.validUntil,
      status: proposal.status
    };
  }

  private parseDuration(duration: string) {
    const durationValue = Number(String(duration || '').match(/\d+/)?.[0] || 60);
    return Math.max(15, Math.min(durationValue, 43200));
  }

  private resolveAttachmentUrls(request: ServiceRequest): Observable<ServiceRequest> {
    const attachments = request.attachments || [];
    if (!attachments.length) {
      return of(request);
    }
    const attachmentRequests = attachments.map(attachment =>
      this.http
        .get<{ downloadUrl: string }>(`${environment.apiUrl}/media/${attachment.mediaId}/download`)
        .pipe(map(response => Object.assign({}, attachment, { dataUrl: response.downloadUrl })))
    );
    return forkJoin(attachmentRequests).pipe(
      map(resolvedAttachments => Object.assign({}, request, { attachments: resolvedAttachments }))
    );
  }
}
