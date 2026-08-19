import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

/** A bounded set keeps interactive bulk operations cheap while folders scale through background jobs. */
export class BulkSelectionDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  folderIds: string[] = [];

  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  fileIds: string[] = [];
}
