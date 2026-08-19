import { IsUUID } from 'class-validator';

export class CompleteUploadDto {
  @IsUUID()
  uploadId!: string;
}
