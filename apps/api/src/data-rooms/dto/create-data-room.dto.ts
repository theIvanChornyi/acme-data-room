import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ValidationLimits } from '../../common/helpers/validation';

export class CreateDataRoomDto {
  @IsString()
  @MinLength(ValidationLimits.minimumNameLength)
  @MaxLength(ValidationLimits.roomNameLength)
  name!: string;
  @IsOptional() @IsString() @MaxLength(ValidationLimits.roomDescriptionLength) description?: string;
}
