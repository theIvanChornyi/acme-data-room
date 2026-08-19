/** Centralized, typed cache keys for TanStack Query. */
export const QueryKeys = {
  rooms: () => ['rooms'] as const,
  roomContents: (roomId: string, folderId?: string, cursor?: string) =>
    ['room-contents', roomId, folderId, cursor] as const,
  roomContentsByRoom: (roomId: string) => ['room-contents', roomId] as const,
  fileSearch: (roomId: string, query: string, cursor?: string) =>
    ['file-search', roomId, query, cursor] as const,
  fileSearchByRoom: (roomId: string) => ['file-search', roomId] as const,
  folderChildren: (roomId: string, parentId: string | null) =>
    ['folder-children', roomId, parentId] as const,
  folderChildrenByRoom: (roomId: string) => ['folder-children', roomId] as const,
} as const;
