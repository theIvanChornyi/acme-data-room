const dataRooms = '/data-rooms';
const publicShares = '/public/shares';
const room = (roomId: string) => `${dataRooms}/${roomId}`;
const folders = (roomId: string) => `${room(roomId)}/folders`;
const roomFile = (roomId: string, fileId: string) => `${room(roomId)}/files/${fileId}`;
const receivedShareFile = (shareId: string, fileId: string) =>
  `${dataRooms}/shared-with-me/${shareId}/files/${fileId}`;
const publicShareFile = (token: string, fileId: string) =>
  `${publicShares}/${token}/files/${fileId}`;

/** Canonical HTTP paths used by the web client. Query parameters stay at the call site. */
export const ApiRoutes = {
  DataRooms: {
    collection: dataRooms,
    room,
    contents: (roomId: string) => `${room(roomId)}/contents`,
    search: (roomId: string) => `${room(roomId)}/search`,
    publicShares: (roomId: string) => `${room(roomId)}/shares/public`,
    publicShare: (roomId: string, shareId: string) => `${room(roomId)}/shares/public/${shareId}`,
    userShares: (roomId: string) => `${room(roomId)}/shares/users`,
    userShare: (roomId: string, shareId: string) => `${room(roomId)}/shares/users/${shareId}`,
    folders,
    folder: (roomId: string, folderId: string) => `${folders(roomId)}/${folderId}`,
    folderOptions: (roomId: string) => `${room(roomId)}/folder-options`,
    folderDeletionSummary: (roomId: string, folderId: string) =>
      `${folders(roomId)}/${folderId}/deletion-summary`,
    bulkDeletionSummary: (roomId: string) => `${room(roomId)}/bulk-deletion-summary`,
    bulkDelete: (roomId: string) => `${room(roomId)}/bulk-delete`,
    uploadUrl: (roomId: string) => `${room(roomId)}/files/upload-url`,
    completeUpload: (roomId: string) => `${room(roomId)}/files/complete-upload`,
    upload: (roomId: string, uploadId: string) => `${room(roomId)}/files/uploads/${uploadId}`,
    file: roomFile,
    viewFile: (roomId: string, fileId: string) => `${roomFile(roomId, fileId)}/view`,
    downloadFile: (roomId: string, fileId: string) => `${roomFile(roomId, fileId)}/download`,
    downloadArchive: (roomId: string) => `${room(roomId)}/downloads/archive`,
    moveFile: (roomId: string, fileId: string) => `${roomFile(roomId, fileId)}/move`,
    moveFileToRoom: (roomId: string, fileId: string) => `${roomFile(roomId, fileId)}/move-to-room`,
    processDeletionJob: (roomId: string, jobId: string) =>
      `${room(roomId)}/deletion-jobs/${encodeURIComponent(jobId)}/process`,
    sharedWithMe: `${dataRooms}/shared-with-me`,
    receivedShareContents: (shareId: string) => `${dataRooms}/shared-with-me/${shareId}/contents`,
    receivedShareViewFile: (shareId: string, fileId: string) =>
      `${receivedShareFile(shareId, fileId)}/view`,
    receivedShareDownloadFile: (shareId: string, fileId: string) =>
      `${receivedShareFile(shareId, fileId)}/download`,
  },
  PublicShares: {
    contents: (token: string) => `${publicShares}/${token}/contents`,
    viewFile: (token: string, fileId: string) => `${publicShareFile(token, fileId)}/view`,
    downloadFile: (token: string, fileId: string) => `${publicShareFile(token, fileId)}/download`,
  },
} as const;
