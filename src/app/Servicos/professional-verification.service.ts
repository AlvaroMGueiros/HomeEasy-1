import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { ProfessionalVerificationStatus, Usuario } from '../Usuarios/usuario';
import { MediaPurpose, MediaUploadService } from './media-upload.service';

interface VerificationQueue {
  documents: Array<{
    id: string;
    professionalId: string;
    type: string;
    professional: { name: string; email: string };
    media: { id: string; fileName: string };
  }>;
}

export enum VerificationDocumentType { Identity = 'identity', AddressProof = 'address_proof', ProfessionalCertificate = 'professional_certificate' }
export interface VerificationDocument { id: string; type: VerificationDocumentType; status: string; reviewNotes?: string; createdAt: string; }

@Injectable({ providedIn: 'root' })
export class ProfessionalVerificationService {
  constructor(private http: HttpClient, private mediaUploadService: MediaUploadService) {}

  findOwnDocuments() { return this.http.get<VerificationDocument[]>(`${environment.apiUrl}/verification/documents/me`); }

  async requestVerification(userId: string, document: File, documentType = VerificationDocumentType.Identity) {
    if (!document) {
      throw new Error('Selecione um documento de identidade em PDF, PNG, JPG ou WebP.');
    }
    const mediaId = await this.mediaUploadService.uploadFile(
      document,
      MediaPurpose.VerificationDocument
    );
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/verification/documents`, {
        mediaId,
        type: documentType
      })
    );
  }

  getPendingProfessionals() {
    return this.http.get<VerificationQueue>(`${environment.apiUrl}/admin/moderation`).pipe(
      map(queue =>
        queue.documents.map(document => ({
          id: document.professionalId,
          nome: document.professional.name,
          email: document.professional.email,
          verificationStatus: ProfessionalVerificationStatus.Pending,
          verificationDocumentId: document.id,
          verificationMediaId: document.media.id,
          verificationDocumentType: document.type
        } as Usuario))
      )
    );
  }

  getDocumentDownloadUrl(mediaId: string) {
    return firstValueFrom(
      this.http.get<{ downloadUrl: string }>(`${environment.apiUrl}/media/${mediaId}/download`)
    ).then(response => response.downloadUrl);
  }

  reviewVerification(adminId: string, documentId: string, approved: boolean, reviewNote: string) {
    return firstValueFrom(
      this.http.patch(`${environment.apiUrl}/admin/verification/documents/${documentId}`, {
        status: approved ? 'approved' : 'rejected',
        notes: reviewNote || undefined
      })
    );
  }
}
