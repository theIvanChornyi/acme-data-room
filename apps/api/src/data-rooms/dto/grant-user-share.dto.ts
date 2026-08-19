import { IsEmail } from 'class-validator';
import { CreatePublicShareDto } from './create-public-share.dto';

export class GrantUserShareDto extends CreatePublicShareDto {
  @IsEmail()
  email!: string;
}
