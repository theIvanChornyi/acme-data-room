import { FileValidation, ValidationLimits } from '../common/helpers/validation';

export const DataRoomStorage = {
  bucket: 'data-room-files',
  rootFolder: 'root',
  rootPath: '/',
  signedUrlTtlSeconds: 10 * 60,
  uploadSessionTtlMilliseconds: 2 * 60 * 60 * 1000,
  maxObjectsPerDelete: 100,
  upload: {
    extension: FileValidation.extension,
    mimeType: FileValidation.mimeType,
    maxSizeBytes: ValidationLimits.uploadSizeBytes,
  },
} as const;
