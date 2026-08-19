import { IsOptional, IsUUID } from 'class-validator';

export class MoveFolderDto {
  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}
