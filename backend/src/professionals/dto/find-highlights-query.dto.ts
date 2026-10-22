import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

export class FindHighlightsQueryDto {
  @IsString()
  @Length(2, 100)
  city: string;
  @Matches(/^[A-Za-z]{2}$/)
  state: string;
  @IsOptional()
  @IsString()
  @Length(1, 12)
  serviceId?: string;
  @IsOptional()
  @IsString()
  @Length(1, 80)
  search?: string;
  @IsOptional()
  @IsString()
  @Length(1, 80)
  category?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  page = 1;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit = 10;
}
