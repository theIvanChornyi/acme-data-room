import type { DataRoomSummary, FolderContents } from '@acme/contracts';
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
};
