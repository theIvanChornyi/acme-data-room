import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateUploadUrlDto {
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(180)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(25 * 1024 * 1024)
  sizeBytes!: number;
}
