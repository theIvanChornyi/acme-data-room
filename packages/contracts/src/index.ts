export type ItemKind = 'folder' | 'file';

/** Mirrors the ShareTargetType enum in the Prisma schema for browser consumers. */
export const ShareTargetType = {
  DATA_ROOM: 'DATA_ROOM',
  FOLDER: 'FOLDER',
  FILE: 'FILE',
} as const;

export type ShareTargetType = (typeof ShareTargetType)[keyof typeof ShareTargetType];

export interface RoomItem {
  id: string;
  name: string;
  kind: ItemKind;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  sizeBytes?: number;
  mimeType?: string;
}

export interface DataRoomSummary {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FolderContents {
  folder: { id: string; name: string; parentId: string | null } | null;
  breadcrumbs: Array<{ id: string; name: string }>;
  items: RoomItem[];
  nextCursor: string | null;
}

export interface FolderDeletionSummary {
  folders: number;
  files: number;
  sizeBytes: string;
  shares: {
    publicLinks: number;
    userAccessGrants: number;
  };
}

export interface DeletionJobProgress {
  id: string;
  deletedFiles: number;
  deletedUploads: number;
  completed: boolean;
}

/** IDs submitted by the workspace selection controls. */
export interface BulkSelection {
  folderIds: string[];
  fileIds: string[];
}

export interface BulkDeletionSummary {
  folders: number;
  files: number;
  sizeBytes: string;
  shares: {
    publicLinks: number;
    userAccessGrants: number;
  };
}

export interface BulkDeletionProgress {
  deletedFiles: number;
  jobs: DeletionJobProgress[];
}

export interface PublicShare {
  id: string;
  token: string;
  description: string | null;
  createdAt: string;
}

export interface PublicShareContents extends FolderContents {
  room: { name: string; description: string | null };
  shareDescription: string | null;
  scopeName: string;
  targetType: ShareTargetType;
}

export interface UserShare {
  id: string;
  email: string;
  pending: boolean;
  createdAt: string;
}

export interface ReceivedShare {
  id: string;
  targetType: ShareTargetType;
  targetName: string;
  roomName: string;
  sharedBy: string;
  createdAt: string;
}
