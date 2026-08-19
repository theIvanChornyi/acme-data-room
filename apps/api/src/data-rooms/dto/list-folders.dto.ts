import { IsOptional, IsUUID } from 'class-validator';

export class ListFoldersDto {
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
