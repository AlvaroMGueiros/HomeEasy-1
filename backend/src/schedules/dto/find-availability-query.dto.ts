import { Type } from 'class-transformer';
import { IsISO8601, IsInt, IsOptional, Max, Min } from 'class-validator';

export class FindAvailabilityQueryDto {
  @IsISO8601({ strict: true })
  availableAt: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(480)
  durationMinutes = 60;
}
