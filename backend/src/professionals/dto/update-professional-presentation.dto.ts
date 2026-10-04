import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateIf,
  ValidateNested
} from 'class-validator';

import { ProfessionalPhoto, ProfessionalPhotoKind } from '../professionalPhoto';
export class ProfessionalPhotoDto implements ProfessionalPhoto {
  @IsUUID()
  mediaId: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsEnum(ProfessionalPhotoKind)
  kind: ProfessionalPhotoKind;

  @IsString()
  @MaxLength(200)
  caption: string;
}

export class UpdateProfessionalPresentationDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Length(40, 2000)
  bio?: string;

  @IsOptional()
  @IsUUID()
  coverPhotoMediaId?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique((photo: ProfessionalPhotoDto) => photo.mediaId)
  @ValidateNested({ each: true })
  @Type(() => ProfessionalPhotoDto)
  portfolioPhotos?: ProfessionalPhotoDto[];
}
