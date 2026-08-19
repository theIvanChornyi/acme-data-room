import type { DataRoomSummary, FolderContents, RoomItem } from '@acme/contracts';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

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

export const api = {
  rooms: () => request<DataRoomSummary[]>('/data-rooms'),
  createRoom: (name: string, description?: string) => request<DataRoomSummary>('/data-rooms', { method: 'POST', body: JSON.stringify({ name, description }) }),
  contents: (roomId: string, folderId?: string) => request<FolderContents>(`/data-rooms/${roomId}/contents${folderId ? `?folderId=${folderId}` : ''}`),
  createFolder: (roomId: string, name: string, parentId?: string) => request(`/data-rooms/${roomId}/folders`, { method: 'POST', body: JSON.stringify({ name, parentId }) }),
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
};
