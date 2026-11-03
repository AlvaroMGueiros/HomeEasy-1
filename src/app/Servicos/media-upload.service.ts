import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { RequestAttachment } from '../shared/models/service-request-field';

export enum MediaPurpose {
  ProfilePhoto = 'profile_photo',
  RequestAttachment = 'request_attachment',
  ChatAttachment = 'chat_attachment',
  VerificationDocument = 'verification_document'
}

interface UploadAuthorization {
  mediaId: string;
  uploadUrl: string;
}

@Injectable({ providedIn: 'root' })
export class MediaUploadService {
  constructor(private http: HttpClient) {}

  async uploadDataUrl(attachment: RequestAttachment, purpose: MediaPurpose) {
    const blob = this.dataUrlToBlob(attachment.dataUrl);
    return this.uploadBlob(blob, attachment.name, attachment.mimeType, purpose);
  }

  uploadFile(file: File, purpose: MediaPurpose) {
    return this.uploadBlob(file, file.name, file.type, purpose);
  }
  getDownloadUrl(mediaId: string) { return this.http.get<{ downloadUrl: string; expiresInSeconds: number }>(`${environment.apiUrl}/media/${mediaId}/download`); }

  private async uploadBlob(blob: Blob, fileName: string, contentType: string, purpose: MediaPurpose) {
    const authorization = await firstValueFrom(
      this.http.post<UploadAuthorization>(`${environment.apiUrl}/media/uploads`, {
        fileName,
        contentType,
        size: blob.size,
        purpose
      })
    );
    await firstValueFrom(
      this.http.put(authorization.uploadUrl, blob, {
        headers: { 'Content-Type': contentType },
        responseType: 'text'
      })
    );
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/media/${authorization.mediaId}/complete`, {})
    );
    return authorization.mediaId;
  }

  private dataUrlToBlob(dataUrl: string) {
    const [metadata, encodedContent] = dataUrl.split(',');
    if (!metadata || !encodedContent) {
      throw new Error('A imagem selecionada está corrompida.');
    }
    const mimeTypeMatch = metadata.match(/^data:([^;]+);base64$/);
    if (!mimeTypeMatch) {
      throw new Error('O formato da imagem selecionada não é válido.');
    }
    const binaryContent = atob(encodedContent);
    const bytes = new Uint8Array(binaryContent.length);
    for (let index = 0; index < binaryContent.length; index += 1) {
      bytes[index] = binaryContent.charCodeAt(index);
    }
    return new Blob([bytes], { type: mimeTypeMatch[1] });
  }
}
