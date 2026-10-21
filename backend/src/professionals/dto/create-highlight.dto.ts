import { ArrayMaxSize, ArrayMinSize, ArrayUnique, Equals, IsArray, IsString, IsUUID, Length } from 'class-validator';

export class CreateHighlightDto {
  @IsString()
  @Length(1, 12)
  serviceId: string;
  @IsString()
  @Length(5, 80)
  title: string;
  @IsString()
  @Length(20, 700)
  description: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  mediaIds: string[];
  @Equals(true)
  hasPublicationConsent: boolean;
}
