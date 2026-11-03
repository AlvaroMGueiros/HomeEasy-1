import { PublicLocation } from '../shared/models/professional-map-location';

export enum ProfessionalVerificationStatus {
    NotSubmitted = 'not_submitted',
    Pending = 'pending',
    IdentityVerified = 'identity_verified',
    ProfessionalVerified = 'professional_verified',
    Featured = 'featured',
    Verified = 'verified',
    Rejected = 'rejected'
}

export enum UserRole {
    User = 'user',
    Admin = 'admin'
}

export class Usuario {
    email? : string;
    senha? : string;
    nome? : string;
    idade? : number;
    birthDate? : string;
    telefone? : string;
    id? : string;
    foto? : string;
    profilePhotoMediaId? : string;
    endereco? : string;
    estado? : string;
    cidade? : string;
    cpf? : number | string;
    cnpj? : number | string;
    instagram? : string;
    facebook? : string;
    twitter? : string;
    site? : string;
    linkedIn? : string;
    availableForService? : boolean;
    serviceBasePrice?: number;
    publicLocation?: PublicLocation;
    serviceDescription?: string;
    averageRating?: number;
    ratingCount?: number;
    verificationStatus? : ProfessionalVerificationStatus;
    verificationRequestedAt? : any;
    verificationReviewedAt? : any;
    verificationReviewedBy? : string;
    verificationReviewNote? : string;
    role? : UserRole;
    conversationId? : string;
    conversationOrderId? : string;
    conversationServiceName? : string;
    conversationWritable? : boolean;
    conversationOrderStatus? : string;
    unreadMessageCount? : number;
    verificationDocumentId? : string;
    verificationMediaId? : string;
    verificationDocumentType? : string;
}
