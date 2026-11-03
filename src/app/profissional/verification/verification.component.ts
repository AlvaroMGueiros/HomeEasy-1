import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ProfessionalVerificationService, VerificationDocument, VerificationDocumentType } from '../../Servicos/professional-verification.service';
import { LoginServiceService } from '../../Servicos/login-service.service';
import { getCurrentUser } from '../../shared/utils/session-user.utils';
import { resolveHttpErrorMessage } from '../../shared/utils/http-error.utils';

@Component({ standalone: false, selector: 'app-verification', templateUrl: './verification.component.html' })
export class VerificationComponent implements OnInit {
  userId = getCurrentUser()?.id || getCurrentUser()?.uid || '';
  documents: VerificationDocument[] = [];
  documentType = VerificationDocumentType.Identity;
  selectedFile: File;
  isLoading = true; isSaving = false; error = ''; feedback = '';
  readonly documentTypes = [
    { value: VerificationDocumentType.Identity, label: 'Documento com foto (RG ou CNH)' },
    { value: VerificationDocumentType.AddressProof, label: 'Comprovante de endereço' },
    { value: VerificationDocumentType.ProfessionalCertificate, label: 'Certificado profissional' }
  ];
  readonly statusLabels = { pending: 'Em análise', in_review: 'Em análise', approved: 'Aprovado', rejected: 'Não aprovado' };
  constructor(private verification: ProfessionalVerificationService, private login: LoginServiceService, private router: Router) {}
  ngOnInit() { void this.load(); }
  label(type: VerificationDocumentType) { return this.documentTypes.find(documentType => documentType.value === type)?.label || 'Documento'; }
  async load() { this.isLoading = true; this.error = ''; try { this.documents = await firstValueFrom(this.verification.findOwnDocuments()); } catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível consultar seus documentos.'); } finally { this.isLoading = false; } }
  selectFile(event: Event) { this.selectedFile = (event.target as HTMLInputElement).files?.[0]; }
  async submit(fileInput: HTMLInputElement) {
    if (!this.selectedFile || this.isSaving) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(this.selectedFile.type) || this.selectedFile.size > 10 * 1024 * 1024) { this.error = 'Escolha um PDF, PNG, JPG ou WebP com até 10 MB.'; return; }
    this.isSaving = true; this.error = '';
    try { await this.verification.requestVerification(this.userId, this.selectedFile, this.documentType); this.selectedFile = null; fileInput.value = ''; await this.load(); this.feedback = 'Documento enviado para análise.'; }
    catch (failure) { this.error = resolveHttpErrorMessage(failure, 'Não foi possível enviar o documento.'); }
    finally { this.isSaving = false; }
  }
  async logout() { await this.login.sair(); await this.router.navigate(['/home']); }
}
