import type {
  BulkDeletionProgress,
  BulkDeletionSummary,
  BulkSelection,
  DataRoomSummary,
  DeletionJobProgress,
  FolderDeletionSummary,
  FolderContents,
  PublicShare,
  PublicShareContents,
  ReceivedShare,
  RoomItem,
  UserShare,
} from '@acme/contracts';
import { ShareTargetType } from '@acme/contracts';
import { supabase } from './supabase';
import { ApiRoutes } from './api-routes';
import { WebMessages } from './messages';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export type PublicShareTarget =
  | { targetType: typeof ShareTargetType.DATA_ROOM }
  | { targetType: typeof ShareTargetType.FOLDER; folderId: string }
  | { targetType: typeof ShareTargetType.FILE; fileId: string };
export type FileSearchResults = { items: RoomItem[]; nextCursor: string | null };
const deletionPollingDelayMilliseconds = 200;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(data.session?.access_token
        ? { Authorization: `Bearer ${data.session.access_token}` }
        : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message ?? WebMessages.api.requestFailed);
  }
  return response.json() as Promise<T>;
}

async function requestStream(path: string, init: RequestInit) {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(data.session?.access_token
        ? { Authorization: `Bearer ${data.session.access_token}` }
        : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message ?? WebMessages.api.requestFailed);
  }
  return response;
}

async function publicRequest<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message ?? WebMessages.api.sharedLinkUnavailable);
  }
  return response.json() as Promise<T>;
}

function contentsQuery(folderId?: string, cursor?: string) {
  const query = new URLSearchParams();
  if (folderId) query.set('folderId', folderId);
  if (cursor) query.set('cursor', cursor);
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

function searchQuery(query: string, cursor?: string) {
  const params = new URLSearchParams({ query });
  if (cursor) params.set('cursor', cursor);
  return `?${params.toString()}`;
}

function uploadToSignedUrl(
  signedUrl: string,
  file: File,
  onProgress: (loaded: number, total: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', 'application/pdf');
    xhr.setRequestHeader('cache-control', 'max-age=3600');
    xhr.setRequestHeader('x-upsert', 'false');
    if (SUPABASE_ANON_KEY) xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded, event.total);
    };
    xhr.onerror = () => reject(new Error(WebMessages.api.uploadInterrupted));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(file.size, file.size);
        resolve();
        return;
      }
      const response = JSON.parse(xhr.responseText || '{}') as { message?: string; error?: string };
      reject(
        new Error(response.message ?? response.error ?? WebMessages.api.unableToUploadToStorage),
      );
    };
    xhr.send(file);
  });
}

export const api = {
  rooms: () => request<DataRoomSummary[]>(ApiRoutes.DataRooms.collection),
  createRoom: (name: string, description?: string) =>
    request<DataRoomSummary>(ApiRoutes.DataRooms.collection, {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),
  renameRoom: (roomId: string, name: string, description?: string) =>
    request<DataRoomSummary>(ApiRoutes.DataRooms.room(roomId), {
      method: 'PATCH',
      body: JSON.stringify({ name, description }),
    }),
  deleteRoom: (roomId: string) =>
    request<DeletionJobProgress>(ApiRoutes.DataRooms.room(roomId), { method: 'DELETE' }),
  contents: (roomId: string, folderId?: string, cursor?: string) =>
    request<FolderContents>(
      `${ApiRoutes.DataRooms.contents(roomId)}${contentsQuery(folderId, cursor)}`,
    ),
  searchFiles: (roomId: string, query: string, cursor?: string) =>
    request<FileSearchResults>(
      `${ApiRoutes.DataRooms.search(roomId)}${searchQuery(query, cursor)}`,
    ),
  publicShares: (roomId: string, target: PublicShareTarget) =>
    request<PublicShare[]>(
      `${ApiRoutes.DataRooms.publicShares(roomId)}?${new URLSearchParams(target).toString()}`,
    ),
  createPublicShare: (roomId: string, target: PublicShareTarget, description?: string) =>
    request<PublicShare>(ApiRoutes.DataRooms.publicShares(roomId), {
      method: 'POST',
      body: JSON.stringify({ ...target, description }),
    }),
  revokePublicShare: (roomId: string, shareId: string) =>
    request(ApiRoutes.DataRooms.publicShare(roomId, shareId), { method: 'DELETE' }),
  userShares: (roomId: string, target: PublicShareTarget) =>
    request<UserShare[]>(
      `${ApiRoutes.DataRooms.userShares(roomId)}?${new URLSearchParams(target).toString()}`,
    ),
  grantUserShare: (roomId: string, target: PublicShareTarget, email: string) =>
    request<UserShare>(ApiRoutes.DataRooms.userShares(roomId), {
      method: 'POST',
      body: JSON.stringify({ ...target, email }),
    }),
  revokeUserShare: (roomId: string, shareId: string) =>
    request(ApiRoutes.DataRooms.userShare(roomId, shareId), { method: 'DELETE' }),
  createFolder: (roomId: string, name: string, parentId?: string) =>
    request<RoomItem>(ApiRoutes.DataRooms.folders(roomId), {
      method: 'POST',
      body: JSON.stringify({ name, parentId }),
    }),
  folders: (roomId: string, parentId?: string) =>
    request<
      Array<{
        id: string;
        name: string;
        parentId: string | null;
        depth: number;
        hasChildren: boolean;
      }>
    >(`${ApiRoutes.DataRooms.folders(roomId)}${parentId ? `?parentId=${parentId}` : ''}`),
  folderOptions: (roomId: string) =>
    request<Array<{ id: string; name: string; parentId: string | null; depth: number }>>(
      ApiRoutes.DataRooms.folderOptions(roomId),
    ),
  renameFolder: (roomId: string, folderId: string, name: string) =>
    request(ApiRoutes.DataRooms.folder(roomId, folderId), {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
  folderDeletionSummary: (roomId: string, folderId: string) =>
    request<FolderDeletionSummary>(ApiRoutes.DataRooms.folderDeletionSummary(roomId, folderId)),
  bulkDeletionSummary: (roomId: string, selection: BulkSelection) =>
    request<BulkDeletionSummary>(ApiRoutes.DataRooms.bulkDeletionSummary(roomId), {
      method: 'POST',
      body: JSON.stringify(selection),
    }),
  bulkDelete: (roomId: string, selection: BulkSelection) =>
    request<BulkDeletionProgress>(ApiRoutes.DataRooms.bulkDelete(roomId), {
      method: 'POST',
      body: JSON.stringify(selection),
    }),
  deleteFolder: (roomId: string, folderId: string) =>
    request<DeletionJobProgress>(ApiRoutes.DataRooms.folder(roomId, folderId), { method: 'DELETE' }),
  processDeletionJob: (roomId: string, jobId: string) =>
    request<DeletionJobProgress>(ApiRoutes.DataRooms.processDeletionJob(roomId, jobId), {
      method: 'POST',
    }),
  uploadFile: async (
    roomId: string,
    folderId: string | undefined,
    file: File,
    onProgress: (loaded: number, total: number) => void,
  ) => {
    const header = new TextDecoder().decode(await file.slice(0, 4).arrayBuffer());
    if (!file.name.toLowerCase().endsWith('.pdf') || header !== '%PDF')
      throw new Error(WebMessages.api.invalidPdf);
    const upload = await request<{ uploadId: string; signedUrl: string }>(
      ApiRoutes.DataRooms.uploadUrl(roomId),
      {
        method: 'POST',
        body: JSON.stringify({ folderId, name: file.name, sizeBytes: file.size }),
      },
    );
    try {
      await uploadToSignedUrl(upload.signedUrl, file, onProgress);
      return request<RoomItem>(ApiRoutes.DataRooms.completeUpload(roomId), {
        method: 'POST',
        body: JSON.stringify({ uploadId: upload.uploadId }),
      });
    } catch (error) {
      void request(ApiRoutes.DataRooms.upload(roomId, upload.uploadId), {
        method: 'DELETE',
      }).catch(() => undefined);
      throw error;
    }
  },
  viewFile: (roomId: string, fileId: string) =>
    request<{ url: string }>(ApiRoutes.DataRooms.viewFile(roomId, fileId)),
  downloadFile: (roomId: string, fileId: string) =>
    request<{ url: string }>(ApiRoutes.DataRooms.downloadFile(roomId, fileId)),
  downloadArchive: (roomId: string, selection: BulkSelection) =>
    requestStream(ApiRoutes.DataRooms.downloadArchive(roomId), {
      method: 'POST',
      body: JSON.stringify(selection),
    }),
  renameFile: (roomId: string, fileId: string, name: string) =>
    request(ApiRoutes.DataRooms.file(roomId, fileId), {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
  moveFile: (roomId: string, fileId: string, folderId: string | null) =>
    request(ApiRoutes.DataRooms.moveFile(roomId, fileId), {
      method: 'PATCH',
      body: JSON.stringify({ folderId }),
    }),
  moveFileToRoom: (roomId: string, fileId: string, destinationRoomId: string) =>
    request(ApiRoutes.DataRooms.moveFileToRoom(roomId, fileId), {
      method: 'PATCH',
      body: JSON.stringify({ destinationRoomId }),
    }),
  deleteFile: (roomId: string, fileId: string) =>
    request(ApiRoutes.DataRooms.file(roomId, fileId), { method: 'DELETE' }),
  publicContents: (token: string, folderId?: string, cursor?: string) =>
    publicRequest<PublicShareContents>(
      `${ApiRoutes.PublicShares.contents(token)}${contentsQuery(folderId, cursor)}`,
    ),
  publicViewFile: (token: string, fileId: string) =>
    publicRequest<{ url: string }>(ApiRoutes.PublicShares.viewFile(token, fileId)),
  publicDownloadFile: (token: string, fileId: string) =>
    publicRequest<{ url: string }>(ApiRoutes.PublicShares.downloadFile(token, fileId)),
  sharedWithMe: () => request<ReceivedShare[]>(ApiRoutes.DataRooms.sharedWithMe),
  sharedWithMeContents: (shareId: string, folderId?: string, cursor?: string) =>
    request<PublicShareContents>(
      `${ApiRoutes.DataRooms.receivedShareContents(shareId)}${contentsQuery(folderId, cursor)}`,
    ),
  sharedWithMeViewFile: (shareId: string, fileId: string) =>
    request<{ url: string }>(ApiRoutes.DataRooms.receivedShareViewFile(shareId, fileId)),
  sharedWithMeDownloadFile: (shareId: string, fileId: string) =>
    request<{ url: string }>(ApiRoutes.DataRooms.receivedShareDownloadFile(shareId, fileId)),
};

/** Keeps foreground deletion moving quickly; the authenticated maintenance worker resumes it later. */
export async function processDeletionUntilComplete(
  roomId: string,
  initialJob: DeletionJobProgress,
  onProgress?: (job: DeletionJobProgress) => void,
) {
  let job = initialJob;
  while (!job.completed) {
    await new Promise<void>((resolve) => window.setTimeout(resolve, deletionPollingDelayMilliseconds));
    job = await api.processDeletionJob(roomId, job.id);
    onProgress?.(job);
  }
  return job;
}

/** Processes a few independent folder jobs at a time, while cron remains the recovery path. */
export async function processDeletionJobsUntilComplete(
  roomId: string,
  initialJobs: DeletionJobProgress[],
  onProgress?: (jobs: DeletionJobProgress[]) => void,
) {
  const jobs = [...initialJobs];
  while (jobs.some((job) => !job.completed)) {
    await new Promise<void>((resolve) => window.setTimeout(resolve, deletionPollingDelayMilliseconds));
    const pendingIndexes = jobs
      .map((job, index) => (!job.completed ? index : -1))
      .filter((index) => index >= 0)
      .slice(0, 3);
    const updates = await Promise.all(
      pendingIndexes.map(async (index) => ({ index, job: await api.processDeletionJob(roomId, jobs[index].id) })),
    );
    updates.forEach(({ index, job }) => {
      jobs[index] = job;
    });
    onProgress?.([...jobs]);
  }
  return jobs;
}
