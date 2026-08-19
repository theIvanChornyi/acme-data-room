import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ValidationLimits } from '../../common/helpers/validation';

export class CreateFolderDto {
  @IsString()
  @MinLength(ValidationLimits.minimumNameLength)
  @MaxLength(ValidationLimits.folderNameLength)
  name!: string;
  @IsOptional() @IsUUID() parentId?: string;
}
