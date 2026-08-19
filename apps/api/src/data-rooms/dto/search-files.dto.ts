import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ValidationLimits } from '../../common/helpers/validation';

export class SearchFilesDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(ValidationLimits.searchQuery.minLength)
  @MaxLength(ValidationLimits.searchQuery.maxLength)
  query!: string;

  @IsOptional()
  @IsString()
  @MaxLength(ValidationLimits.cursorLength)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(ValidationLimits.pageSize.min)
  @Max(ValidationLimits.pageSize.max)
  limit?: number;
}
