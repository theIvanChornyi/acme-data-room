import type { DataRoomSummary, FolderContents, PublicShare, PublicShareContents, ReceivedShare, RoomItem, UserShare } from '@acme/contracts';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export type PublicShareTarget = { targetType: 'DATA_ROOM' } | { targetType: 'FOLDER'; folderId: string } | { targetType: 'FILE'; fileId: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}), ...init?.headers },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message ?? 'Something went wrong. Please try again.');
  }
  return response.json() as Promise<T>;
}

async function publicRequest<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message ?? 'This shared link is unavailable.');
  }
  return response.json() as Promise<T>;
}

export const api = {
  rooms: () => request<DataRoomSummary[]>('/data-rooms'),
  createRoom: (name: string, description?: string) => request<DataRoomSummary>('/data-rooms', { method: 'POST', body: JSON.stringify({ name, description }) }),
  renameRoom: (roomId: string, name: string, description?: string) => request<DataRoomSummary>(`/data-rooms/${roomId}`, { method: 'PATCH', body: JSON.stringify({ name, description }) }),
  deleteRoom: (roomId: string) => request(`/data-rooms/${roomId}`, { method: 'DELETE' }),
  contents: (roomId: string, folderId?: string) => request<FolderContents>(`/data-rooms/${roomId}/contents${folderId ? `?folderId=${folderId}` : ''}`),
  publicShares: (roomId: string, target: PublicShareTarget) => request<PublicShare[]>(`/data-rooms/${roomId}/shares/public?${new URLSearchParams(target).toString()}`),
  createPublicShare: (roomId: string, target: PublicShareTarget, description?: string) => request<PublicShare>(`/data-rooms/${roomId}/shares/public`, { method: 'POST', body: JSON.stringify({ ...target, description }) }),
  revokePublicShare: (roomId: string, shareId: string) => request(`/data-rooms/${roomId}/shares/public/${shareId}`, { method: 'DELETE' }),
  userShares: (roomId: string, target: PublicShareTarget) => request<UserShare[]>(`/data-rooms/${roomId}/shares/users?${new URLSearchParams(target).toString()}`),
  grantUserShare: (roomId: string, target: PublicShareTarget, email: string) => request<UserShare>(`/data-rooms/${roomId}/shares/users`, { method: 'POST', body: JSON.stringify({ ...target, email }) }),
  revokeUserShare: (roomId: string, shareId: string) => request(`/data-rooms/${roomId}/shares/users/${shareId}`, { method: 'DELETE' }),
  createFolder: (roomId: string, name: string, parentId?: string) => request<RoomItem>(`/data-rooms/${roomId}/folders`, { method: 'POST', body: JSON.stringify({ name, parentId }) }),
  folders: (roomId: string) => request<Array<{ id: string; name: string; parentId: string | null; depth: number }>>(`/data-rooms/${roomId}/folders`),
  renameFolder: (roomId: string, folderId: string, name: string) => request(`/data-rooms/${roomId}/folders/${folderId}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  folderDeletionSummary: (roomId: string, folderId: string) => request<{ folders: number; files: number; sizeBytes: string }>(`/data-rooms/${roomId}/folders/${folderId}/deletion-summary`),
  deleteFolder: (roomId: string, folderId: string) => request(`/data-rooms/${roomId}/folders/${folderId}`, { method: 'DELETE' }),
  uploadFile: async (roomId: string, folderId: string | undefined, file: File, onProgress: (loaded: number, total: number) => void) => {
    const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
    if (!data.session?.access_token) throw new Error('Your session has expired. Please sign in again.');
    return new Promise<RoomItem>((resolve, reject) => {
      const form = new FormData();
      form.append('files', file);
      if (folderId) form.append('folderId', folderId);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}/data-rooms/${roomId}/files`);
      xhr.setRequestHeader('Authorization', `Bearer ${data.session.access_token}`);
      xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(event.loaded, event.total); };
      xhr.onerror = () => reject(new Error('Upload interrupted. Check your connection and try again.'));
      xhr.onload = () => {
        const payload = JSON.parse(xhr.responseText || '{}') as RoomItem[] | { message?: string };
        if (xhr.status >= 200 && xhr.status < 300 && Array.isArray(payload) && payload[0]) resolve(payload[0]);
        else reject(new Error(Array.isArray(payload) ? 'Unable to upload files.' : payload.message ?? 'Unable to upload files.'));
      };
      xhr.send(form);
    });
  },
  viewFile: (roomId: string, fileId: string) => request<{ url: string }>(`/data-rooms/${roomId}/files/${fileId}/view`),
  downloadFile: (roomId: string, fileId: string) => request<{ url: string }>(`/data-rooms/${roomId}/files/${fileId}/download`),
  renameFile: (roomId: string, fileId: string, name: string) => request(`/data-rooms/${roomId}/files/${fileId}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  moveFile: (roomId: string, fileId: string, folderId: string | null) => request(`/data-rooms/${roomId}/files/${fileId}/move`, { method: 'PATCH', body: JSON.stringify({ folderId }) }),
  moveFileToRoom: (roomId: string, fileId: string, destinationRoomId: string) => request(`/data-rooms/${roomId}/files/${fileId}/move-to-room`, { method: 'PATCH', body: JSON.stringify({ destinationRoomId }) }),
  deleteFile: (roomId: string, fileId: string) => request(`/data-rooms/${roomId}/files/${fileId}`, { method: 'DELETE' }),
  publicContents: (token: string, folderId?: string) => publicRequest<PublicShareContents>(`/public/shares/${token}/contents${folderId ? `?folderId=${folderId}` : ''}`),
  publicViewFile: (token: string, fileId: string) => publicRequest<{ url: string }>(`/public/shares/${token}/files/${fileId}/view`),
  publicDownloadFile: (token: string, fileId: string) => publicRequest<{ url: string }>(`/public/shares/${token}/files/${fileId}/download`),
  sharedWithMe: () => request<ReceivedShare[]>('/data-rooms/shared-with-me'),
  sharedWithMeContents: (shareId: string, folderId?: string) => request<PublicShareContents>(`/data-rooms/shared-with-me/${shareId}/contents${folderId ? `?folderId=${folderId}` : ''}`),
  sharedWithMeViewFile: (shareId: string, fileId: string) => request<{ url: string }>(`/data-rooms/shared-with-me/${shareId}/files/${fileId}/view`),
  sharedWithMeDownloadFile: (shareId: string, fileId: string) => request<{ url: string }>(`/data-rooms/shared-with-me/${shareId}/files/${fileId}/download`),
};
