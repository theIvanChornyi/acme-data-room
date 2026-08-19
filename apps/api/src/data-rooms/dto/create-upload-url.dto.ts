import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ValidationLimits } from '../../common/helpers/validation';

export class CreateUploadUrlDto {
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @IsString()
  @MinLength(ValidationLimits.minimumNameLength)
  @MaxLength(ValidationLimits.fileNameLength)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(ValidationLimits.minUploadSizeBytes)
  @Max(ValidationLimits.uploadSizeBytes)
  sizeBytes!: number;
}
