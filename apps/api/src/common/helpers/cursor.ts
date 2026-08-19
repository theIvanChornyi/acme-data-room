import { isUuid, ValidationLimits } from './validation';

export type PageCursor = { updatedAt: string; id: string };
export type FileSearchCursor = { name: string; id: string };
export type ContentsCursor = { kind: 'folder' | 'file'; name: string; id: string };

export function encodeCursor(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export function decodePageCursor(value: string | undefined): PageCursor | undefined | null {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as {
      updatedAt?: unknown;
      id?: unknown;
    };
    return typeof parsed.updatedAt === 'string' &&
      !Number.isNaN(Date.parse(parsed.updatedAt)) &&
      isUuid(parsed.id)
      ? { updatedAt: parsed.updatedAt, id: parsed.id }
      : null;
  } catch {
    return null;
  }
}

export function decodeFileSearchCursor(
  value: string | undefined,
): FileSearchCursor | undefined | null {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as {
      name?: unknown;
      id?: unknown;
    };
    return typeof parsed.name === 'string' &&
      parsed.name.length > 0 &&
      parsed.name.length <= ValidationLimits.fileNameLength &&
      isUuid(parsed.id)
      ? { name: parsed.name, id: parsed.id }
      : null;
  } catch {
    return null;
  }
}

export function decodeContentsCursor(value: string | undefined): ContentsCursor | undefined | null {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as {
      kind?: unknown;
      name?: unknown;
      id?: unknown;
    };
    return (parsed.kind === 'folder' || parsed.kind === 'file') &&
      typeof parsed.name === 'string' &&
      parsed.name.length > 0 &&
      parsed.name.length <= ValidationLimits.fileNameLength &&
      isUuid(parsed.id)
      ? { kind: parsed.kind, name: parsed.name, id: parsed.id }
      : null;
  } catch {
    return null;
  }
}
