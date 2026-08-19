import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateFolderDto {
  @IsString() @MinLength(1) @MaxLength(180) name!: string;
  @IsOptional() @IsUUID() parentId?: string;
}
