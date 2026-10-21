import { IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';

import { ReportCategory } from '../moderation.enums';

export class CreateReportDto {
  @IsOptional()
  @IsUUID()
  highlightId?: string;

  @IsOptional()
  @IsUUID()
  targetUserId?: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @IsOptional()
  @IsUUID()
  reviewId?: string;

  @IsOptional()
  @IsUUID()
  messageId?: string;

  @IsEnum(ReportCategory)
  category: ReportCategory;

  @IsString()
  @Length(20, 2000)
  description: string;
}
