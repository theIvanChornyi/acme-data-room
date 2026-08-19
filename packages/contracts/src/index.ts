export type ItemKind = 'folder' | 'file';

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
