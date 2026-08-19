import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePublicShareDto {
  @IsIn(['DATA_ROOM', 'FOLDER', 'FILE'])
  targetType!: 'DATA_ROOM' | 'FOLDER' | 'FILE';

  @IsOptional()
  @IsUUID()
  folderId?: string;

  @IsOptional()
  @IsUUID()
  fileId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string;
}
