import { IsOptional, IsUUID } from 'class-validator';

export class MoveFileDto {
  @IsOptional()
  @IsUUID()
  folderId?: string | null;
}
