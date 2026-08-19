import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal, Pencil, Plus, Share2, ShieldCheck, Trash2 } from 'lucide-react';
import { ShareTargetType, type DataRoomSummary, type ReceivedShare } from '@acme/contracts';
import { AppLayout } from '../../components/AppLayout';
import { DataRoomDialog, DeleteDataRoomDialog } from '../../components/DataRoomDialog';
import { api } from '../../lib/api';
import { messageFrom, WebMessages } from '../../lib/messages';
import { AppRoutes } from '../../routes/app-routes';

export function DashboardPage() {
  const [rooms, setRooms] = useState<DataRoomSummary[]>([]);
  const [sharedItems, setSharedItems] = useState<ReceivedShare[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingRoom, setEditingRoom] = useState<DataRoomSummary | null | undefined>(null);
  const [deletingRoom, setDeletingRoom] = useState<DataRoomSummary | null>(null);
  const [menuRoomId, setMenuRoomId] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([api.rooms(), api.sharedWithMe()])
      .then(([ownedRooms, shared]) => {
        setRooms(ownedRooms);
        setSharedItems(shared);
      })
      .catch((cause) => setError(messageFrom(cause, WebMessages.workspace.unavailable)))
      .finally(() => setLoading(false));
  }, []);

  const saveRoom = async (name: string, description: string) => {
    if (editingRoom) {
      const updated = await api.renameRoom(editingRoom.id, name, description);
      setRooms((current) => current.map((room) => (room.id === updated.id ? updated : room)));
    } else {
      const created = await api.createRoom(name, description || undefined);
      setRooms((current) => [created, ...current]);
    }
  };

  const deleteRoom = async () => {
    if (!deletingRoom) return;
    await api.deleteRoom(deletingRoom.id);
    setRooms((current) => current.filter((room) => room.id !== deletingRoom.id));
  };

  return (
    <AppLayout>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-brand">Workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Your Data Rooms</h1>
        </div>
        <button
          title="New Data Room"
          onClick={() => setEditingRoom(undefined)}
          className="rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white"
        >
          <Plus className="mr-1.5 inline" size={17} />
          New Data Room
        </button>
      </div>
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="text-sm text-slate-500">Loading your workspace…</p>
      ) : (
        <>
          <section>
            {rooms.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rooms.map((room) => (
                  <article
                    key={room.id}
                    className="relative min-w-0 rounded-xl border bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-blue-200"
                  >
                    <Link to={AppRoutes.room(room.id)} className="block min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-brand">
                        <ShieldCheck size={20} />
                      </div>
                      <h2 className="mt-5 break-words pr-7 font-semibold line-clamp-2">
                        {room.name}
                      </h2>
                      <p className="mt-1 line-clamp-2 min-h-10 break-words text-sm text-slate-500">
                        {room.description ?? 'No description provided.'}
                      </p>
                      <p className="mt-5 text-xs text-slate-400">
                        Updated {new Date(room.updatedAt).toLocaleDateString()}
                      </p>
                    </Link>
                    <div className="absolute right-4 top-4">
                      <button
                        title={`Actions for ${room.name}`}
                        aria-label={`Actions for ${room.name}`}
                        onClick={() =>
                          setMenuRoomId((current) => (current === room.id ? null : room.id))
                        }
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      {menuRoomId === room.id && (
                        <div className="absolute right-0 z-10 mt-1 w-36 rounded-lg border bg-white py-1 shadow-lg">
                          <button
                            title={`Rename ${room.name}`}
                            onClick={() => {
                              setMenuRoomId(null);
                              setEditingRoom(room);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                          >
                            <Pencil size={15} />
                            Rename
                          </button>
                          <button
                            title={`Delete ${room.name}`}
                            onClick={() => {
                              setMenuRoomId(null);
                              setDeletingRoom(room);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={15} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-white py-20 text-center">
                <h2 className="font-semibold">Create your first Data Room</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Start with one secure place for all deal documents.
                </p>
              </div>
            )}
          </section>
          <section className="mt-10 border-t pt-8">
            <div>
              <p className="text-sm font-medium text-brand">Read-only access</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">Shared with me</h2>
              <p className="mt-1 text-sm text-slate-500">
                Data Rooms, folders, and documents other people shared with you.
              </p>
            </div>
            {sharedItems.length ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sharedItems.map((share) => (
                  <Link
                    key={share.id}
                    to={AppRoutes.receivedShare(share.id)}
                    className="min-w-0 rounded-xl border bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-blue-200"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-brand">
                      <Share2 size={20} />
                    </div>
                    <h3 className="mt-5 break-words font-semibold line-clamp-2">
                      {share.targetName}
                    </h3>
                    <p className="mt-1 break-words text-sm text-slate-500 line-clamp-2">
                      {share.targetType === ShareTargetType.DATA_ROOM
                        ? 'Data Room'
                        : share.targetType === ShareTargetType.FOLDER
                          ? `Folder in ${share.roomName}`
                          : `PDF in ${share.roomName}`}
                    </p>
                    <p className="mt-3 truncate text-xs text-slate-400">
                      Shared by {share.sharedBy}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Shared {new Date(share.createdAt).toLocaleDateString()}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed bg-white px-5 py-8 text-sm text-slate-500">
                Nothing has been shared with you yet.
              </p>
            )}
          </section>
        </>
      )}
      <DataRoomDialog room={editingRoom} onClose={() => setEditingRoom(null)} onSubmit={saveRoom} />
      <DeleteDataRoomDialog
        room={deletingRoom}
        onClose={() => setDeletingRoom(null)}
        onDelete={deleteRoom}
      />
    </AppLayout>
  );
}
