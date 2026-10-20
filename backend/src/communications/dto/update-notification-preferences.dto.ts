import { IsBoolean } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsBoolean()
  pushEnabled: boolean;
  @IsBoolean()
  messages: boolean;
  @IsBoolean()
  quotes: boolean;
  @IsBoolean()
  serviceUpdates: boolean;
  @IsBoolean()
  reviews: boolean;
  @IsBoolean()
  opportunities: boolean;
}
