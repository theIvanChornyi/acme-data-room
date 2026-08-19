import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { ValidationLimits } from '../../common/helpers/validation';

export class ContentsQueryDto {
  @IsOptional()
  @IsUUID()
  folderId?: string;

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
