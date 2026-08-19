export const ValidationLimits = {
  pageSize: { min: 1, max: 100, default: 50 },
  cursorLength: 512,
  minimumNameLength: 1,
  fileNameLength: 180,
  folderNameLength: 180,
  roomNameLength: 120,
  roomDescriptionLength: 500,
  shareDescriptionLength: 280,
  searchQuery: { minLength: 3, maxLength: 180 },
  minUploadSizeBytes: 1,
  uploadSizeBytes: 25 * 1024 * 1024,
} as const;

export const FileValidation = {
  extension: '.pdf',
  mimeType: 'application/pdf',
} as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PATH_SEPARATOR_PATTERN = /[\\/]/g;
const WHITESPACE_PATTERN = /\s+/g;
const ALREADY_EXISTS_PATTERN = /already exists/i;
const UNIQUE_CONSTRAINT_ERROR_CODE = 'P2002';

export function clampPageSize(value: number | undefined) {
  return Math.min(
    Math.max(value ?? ValidationLimits.pageSize.default, ValidationLimits.pageSize.min),
    ValidationLimits.pageSize.max,
  );
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function normalizeItemName(value: string) {
  return value.trim().replace(PATH_SEPARATOR_PATTERN, '-').replace(WHITESPACE_PATTERN, ' ');
}

export function normalizeRoomName(value: string) {
  return value.trim().replace(WHITESPACE_PATTERN, ' ');
}

export function hasFileExtension(fileName: string, extension: string) {
  return fileName.toLowerCase().endsWith(extension.toLowerCase());
}

export function isValidUploadSize(sizeBytes: number) {
  return (
    Number.isSafeInteger(sizeBytes) &&
    sizeBytes >= ValidationLimits.minUploadSizeBytes &&
    sizeBytes <= ValidationLimits.uploadSizeBytes
  );
}

export function isExpectedMimeType(contentType: string | undefined, expectedMimeType: string) {
  return contentType?.split(';')[0].trim().toLowerCase() === expectedMimeType.toLowerCase();
}

export function isAlreadyExistsError(message: string) {
  return ALREADY_EXISTS_PATTERN.test(message);
}

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === UNIQUE_CONSTRAINT_ERROR_CODE
  );
}
