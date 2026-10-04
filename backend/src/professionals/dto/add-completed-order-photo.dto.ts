import { IsString, IsUUID, MaxLength } from 'class-validator';

export class AddCompletedOrderPhotoDto {
  @IsUUID()
  mediaId: string;

  @IsString()
  @MaxLength(200)
  caption: string;
}
