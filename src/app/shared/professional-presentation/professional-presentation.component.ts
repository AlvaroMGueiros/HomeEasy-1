import { Component, Input, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ProfessionalProfileService } from '../../Servicos/professional-profile.service';
import { MediaPurpose, MediaUploadService } from '../../Servicos/media-upload.service';
import { ProfessionalPhoto, ProfessionalPhotoKind, ProfessionalProfile } from '../models/professional-profile';
import { createCompressedImageAttachment } from '../utils/image-attachment.utils';
import { resolveHttpErrorMessage } from '../utils/http-error.utils';
import { environment } from '../../../environments/environment';

@Component({ standalone: false, selector: 'app-professional-presentation', templateUrl: './professional-presentation.component.html', styleUrls: ['./professional-presentation.component.css'] })
export class ProfessionalPresentationComponent implements OnInit {
  @Input() orderId = '';
  profile: ProfessionalProfile;
  bio = '';
  caption = '';
  isLoading = true;
  isSaving = false;
  error = '';
  feedback = '';
  constructor(private profiles: ProfessionalProfileService, private media: MediaUploadService) {}
  ngOnInit() { void this.load(); }
  async load() {
    this.isLoading = true; this.error = '';
    try { this.profile = await firstValueFrom(this.profiles.findOwn()); this.bio = this.profile.bio || ''; }
    catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível carregar sua apresentação profissional.'); }
    finally { this.isLoading = false; }
  }
  mediaUrl(mediaId: string) { return `${environment.apiUrl}/media/${mediaId}/public`; }
  get photos() { return (this.profile?.portfolioPhotos || []).filter(photo => !this.orderId || photo.orderId === this.orderId); }
  async saveBio() {
    if (this.isSaving || this.bio.trim().length < 40) return;
    this.isSaving = true; this.error = '';
    try { this.profile = await firstValueFrom(this.profiles.updatePresentation({ bio: this.bio.trim() })); this.feedback = 'Apresentação salva.'; }
    catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível salvar sua apresentação.'); }
    finally { this.isSaving = false; }
  }
  async uploadPhoto(event: Event, isCover = false) {
    const input = event.target as HTMLInputElement;
    const selectedFile = input.files?.[0];
    if (!selectedFile || this.isSaving) return;
    if (!isCover && (this.profile.portfolioPhotos?.length || 0) >= 30) { this.error = 'Seu portfólio já tem 30 fotos. Remova uma foto antes de adicionar outra.'; input.value = ''; return; }
    this.isSaving = true; this.error = ''; this.feedback = '';
    try {
      const attachment = await createCompressedImageAttachment(selectedFile);
      const mediaId = await this.media.uploadDataUrl(attachment, MediaPurpose.ProfilePhoto);
      if (isCover) this.profile = await firstValueFrom(this.profiles.updatePresentation({ coverPhotoMediaId: mediaId }));
      else if (this.orderId) this.profile = await firstValueFrom(this.profiles.addCompletedPhoto(this.orderId, mediaId, this.caption.trim()));
      else {
        const photo: ProfessionalPhoto = { mediaId, caption: this.caption.trim(), kind: ProfessionalPhotoKind.Offered };
        this.profile = await firstValueFrom(this.profiles.updatePresentation({ portfolioPhotos: [...(this.profile.portfolioPhotos || []), photo] }));
      }
      this.caption = ''; this.feedback = 'Foto publicada no portfólio.';
    } catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível publicar a foto.'); }
    finally { this.isSaving = false; input.value = ''; }
  }
  async removePhoto(mediaId: string) {
    if (this.isSaving) return;
    this.isSaving = true; this.error = '';
    try { this.profile = await firstValueFrom(this.profiles.updatePresentation({ portfolioPhotos: (this.profile.portfolioPhotos || []).filter(photo => photo.mediaId !== mediaId) })); }
    catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível remover a foto do portfólio.'); }
    finally { this.isSaving = false; }
  }
}
