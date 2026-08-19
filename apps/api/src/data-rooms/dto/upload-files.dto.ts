import { IsOptional, IsUUID } from 'class-validator';

export class UploadFilesDto {
  @IsOptional()
  @IsUUID()
  folderId?: string;
}
