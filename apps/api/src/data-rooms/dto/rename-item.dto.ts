import { IsString, MaxLength, MinLength } from 'class-validator';
import { ValidationLimits } from '../../common/helpers/validation';

export class RenameItemDto {
  @IsString()
  @MinLength(ValidationLimits.minimumNameLength)
  @MaxLength(ValidationLimits.fileNameLength)
  name!: string;
}
