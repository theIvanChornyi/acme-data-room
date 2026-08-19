import { ShareTargetType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ValidationLimits } from '../../common/helpers/validation';

export class CreatePublicShareDto {
  @IsEnum(ShareTargetType)
  targetType!: ShareTargetType;

  @IsOptional()
  @IsUUID()
  folderId?: string;

  @IsOptional()
  @IsUUID()
  fileId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(ValidationLimits.shareDescriptionLength)
  description?: string;
}
