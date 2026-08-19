import { IsString, MaxLength, MinLength } from 'class-validator';

export class RenameItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  name!: string;
}
