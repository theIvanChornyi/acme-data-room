/** Names used by Nest route decorators and route patterns. */
export const ApiRouteParameters = {
  roomId: 'roomId',
  shareId: 'shareId',
  folderId: 'folderId',
  fileId: 'fileId',
  uploadId: 'uploadId',
  deletionJobId: 'deletionJobId',
  token: 'token',
} as const;

export const ApiRequestHeaders = {
  maintenanceSecret: 'x-maintenance-secret',
} as const;

const routeParameter = (name: (typeof ApiRouteParameters)[keyof typeof ApiRouteParameters]) =>
  `:${name}`;

const roomId = routeParameter(ApiRouteParameters.roomId);
const shareId = routeParameter(ApiRouteParameters.shareId);
const folderId = routeParameter(ApiRouteParameters.folderId);
const fileId = routeParameter(ApiRouteParameters.fileId);
const uploadId = routeParameter(ApiRouteParameters.uploadId);
const deletionJobId = routeParameter(ApiRouteParameters.deletionJobId);
const token = routeParameter(ApiRouteParameters.token);

/** Canonical Nest route patterns. Keep parameter names aligned with controller decorators. */
export const ApiRoutes = {
  globalPrefix: 'api',
  DataRooms: {
    controller: 'data-rooms',
    room: roomId,
    contents: `${roomId}/contents`,
    search: `${roomId}/search`,
    publicShares: `${roomId}/shares/public`,
    publicShare: `${roomId}/shares/public/${shareId}`,
    userShares: `${roomId}/shares/users`,
    userShare: `${roomId}/shares/users/${shareId}`,
    sharedWithMe: 'shared-with-me',
    receivedShareContents: `shared-with-me/${shareId}/contents`,
    receivedShareViewFile: `shared-with-me/${shareId}/files/${fileId}/view`,
    receivedShareDownloadFile: `shared-with-me/${shareId}/files/${fileId}/download`,
    folders: `${roomId}/folders`,
    folder: `${roomId}/folders/${folderId}`,
    folderOptions: `${roomId}/folder-options`,
    folderDeletionSummary: `${roomId}/folders/${folderId}/deletion-summary`,
    bulkDeletionSummary: `${roomId}/bulk-deletion-summary`,
    bulkDelete: `${roomId}/bulk-delete`,
    uploadUrl: `${roomId}/files/upload-url`,
    completeUpload: `${roomId}/files/complete-upload`,
    upload: `${roomId}/files/uploads/${uploadId}`,
    file: `${roomId}/files/${fileId}`,
    viewFile: `${roomId}/files/${fileId}/view`,
    downloadFile: `${roomId}/files/${fileId}/download`,
    downloadArchive: `${roomId}/downloads/archive`,
    moveFile: `${roomId}/files/${fileId}/move`,
    moveFileToRoom: `${roomId}/files/${fileId}/move-to-room`,
    processDeletionJob: `${roomId}/deletion-jobs/${deletionJobId}/process`,
  },
  PublicShares: {
    controller: 'public/shares',
    contents: `${token}/contents`,
    viewFile: `${token}/files/${fileId}/view`,
    downloadFile: `${token}/files/${fileId}/download`,
  },
  Maintenance: {
    controller: 'maintenance',
    expiredUploads: 'expired-uploads',
  },
} as const;
