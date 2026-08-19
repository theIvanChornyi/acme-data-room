import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDataRoomDto } from './dto/create-data-room.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { CreatePublicShareDto } from './dto/create-public-share.dto';
import { GrantUserShareDto } from './dto/grant-user-share.dto';

@Injectable()
export class DataRoomsService {
  private readonly storageBucket = 'data-room-files';
  private bucketReady = false;

  constructor(private readonly prisma: PrismaService) {}

  async list(ownerId: string) {
    return this.prisma.dataRoom.findMany({ where: { ownerId }, orderBy: { updatedAt: 'desc' } });
  }

  async create(ownerId: string, email: string, dto: CreateDataRoomDto) {
    await this.prisma.user.upsert({ where: { id: ownerId }, update: { email }, create: { id: ownerId, email } });
    return this.prisma.dataRoom.create({ data: { name: this.cleanRoomName(dto.name), description: dto.description?.trim() || null, ownerId } });
  }

  async renameRoom(roomId: string, ownerId: string, dto: CreateDataRoomDto) {
    await this.assertOwner(roomId, ownerId);
    return this.prisma.dataRoom.update({ where: { id: roomId }, data: { name: this.cleanRoomName(dto.name), description: dto.description?.trim() || null } });
  }

  async deleteRoom(roomId: string, ownerId: string) {
    await this.assertOwner(roomId, ownerId);
    const files = await this.prisma.file.findMany({ where: { dataRoomId: roomId }, select: { storagePath: true } });
    await this.removeStorageObjects(files.map((file) => file.storagePath));
    await this.prisma.dataRoom.delete({ where: { id: roomId } });
    return { deleted: { files: files.length } };
  }

  async contents(roomId: string, ownerId: string, folderId?: string) {
    await this.assertOwner(roomId, ownerId);
    return this.roomContents(roomId, folderId);
  }

  async listPublicShares(roomId: string, ownerId: string, dto: CreatePublicShareDto) {
    await this.assertOwner(roomId, ownerId);
    return this.prisma.share.findMany({
      where: { dataRoomId: roomId, ...this.shareTargetWhere(dto), accessType: 'PUBLIC_LINK', revokedAt: null },
      select: { id: true, token: true, description: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPublicShare(roomId: string, ownerId: string, dto: CreatePublicShareDto) {
    await this.assertOwner(roomId, ownerId);
    await this.assertShareTarget(roomId, dto);
    return this.prisma.share.create({
      data: { dataRoomId: roomId, targetType: dto.targetType, accessType: 'PUBLIC_LINK', role: 'VIEWER', token: randomBytes(32).toString('base64url'), description: dto.description?.trim() || null, folderId: dto.targetType === 'FOLDER' ? dto.folderId : null, fileId: dto.targetType === 'FILE' ? dto.fileId : null },
      select: { id: true, token: true, description: true, createdAt: true },
    });
  }

  async revokePublicShare(roomId: string, ownerId: string, shareId: string) {
    await this.assertOwner(roomId, ownerId);
    const share = await this.prisma.share.findFirst({ where: { id: shareId, dataRoomId: roomId, accessType: 'PUBLIC_LINK', revokedAt: null } });
    if (!share) throw new NotFoundException('Public link not found');
    await this.prisma.share.update({ where: { id: shareId }, data: { revokedAt: new Date() } });
    return { revoked: true };
  }

  async listUserShares(roomId: string, ownerId: string, dto: CreatePublicShareDto) {
    await this.assertOwner(roomId, ownerId);
    return this.prisma.share.findMany({
      where: { dataRoomId: roomId, ...this.shareTargetWhere(dto), accessType: 'USER', revokedAt: null },
      select: { id: true, createdAt: true, recipient: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
    }).then((shares) => shares.map((share) => ({ id: share.id, email: share.recipient?.email ?? '', createdAt: share.createdAt })));
  }

  async grantUserShare(roomId: string, ownerId: string, dto: GrantUserShareDto) {
    await this.assertOwner(roomId, ownerId);
    await this.assertShareTarget(roomId, dto);
    const email = dto.email.trim().toLowerCase();
    const recipient = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!recipient) throw new BadRequestException('This person must sign in with Google before you can grant access');
    if (recipient.id === ownerId) throw new BadRequestException('The owner already has access to this Data Room');
    const where = { dataRoomId: roomId, ...this.shareTargetWhere(dto), accessType: 'USER' as const, recipientId: recipient.id, revokedAt: null };
    const existing = await this.prisma.share.findFirst({ where, select: { id: true, createdAt: true } });
    if (existing) return { ...existing, email };
    const share = await this.prisma.share.create({
      data: { dataRoomId: roomId, targetType: dto.targetType, accessType: 'USER', role: 'VIEWER', recipientId: recipient.id, folderId: dto.targetType === 'FOLDER' ? dto.folderId : null, fileId: dto.targetType === 'FILE' ? dto.fileId : null },
      select: { id: true, createdAt: true },
    });
    return { ...share, email };
  }

  async revokeUserShare(roomId: string, ownerId: string, shareId: string) {
    await this.assertOwner(roomId, ownerId);
    const share = await this.prisma.share.findFirst({ where: { id: shareId, dataRoomId: roomId, accessType: 'USER', revokedAt: null } });
    if (!share) throw new NotFoundException('User access not found');
    await this.prisma.share.update({ where: { id: shareId }, data: { revokedAt: new Date() } });
    return { revoked: true };
  }

  async sharedWithMe(recipientId: string) {
    const shares = await this.prisma.share.findMany({
      where: { recipientId, accessType: 'USER', revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      include: { dataRoom: { select: { name: true, owner: { select: { email: true } } } }, folder: { select: { name: true } }, file: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return shares.map((share) => ({ id: share.id, targetType: share.targetType, targetName: share.folder?.name ?? share.file?.name ?? share.dataRoom.name, roomName: share.dataRoom.name, sharedBy: share.dataRoom.owner.email, createdAt: share.createdAt }));
  }

  async publicContents(token: string, folderId?: string) {
    const share = await this.activePublicShare(token);
    if (share.targetType === 'FILE') {
      if (!share.file) throw new NotFoundException('This shared file is unavailable');
      return { room: { name: share.dataRoom.name, description: share.dataRoom.description }, shareDescription: share.description, scopeName: share.file.name, targetType: 'FILE', folder: null, breadcrumbs: [], items: [{ ...share.file, kind: 'file', sizeBytes: share.file.sizeBytes.toString() }] };
    }
    const sharedFolder = share.targetType === 'FOLDER' ? share.folder : null;
    if (share.targetType === 'FOLDER' && !sharedFolder) throw new NotFoundException('This shared folder is unavailable');
    const requestedFolderId = folderId ?? sharedFolder?.id;
    if (sharedFolder && requestedFolderId) {
      const requested = await this.prisma.folder.findFirst({ where: { id: requestedFolderId, dataRoomId: share.dataRoomId, path: { startsWith: sharedFolder.path } }, select: { id: true } });
      if (!requested) throw new NotFoundException('This folder is outside the shared area');
    }
    const contents = await this.roomContents(share.dataRoomId, requestedFolderId);
    const breadcrumbs = sharedFolder ? contents.breadcrumbs.slice(Math.max(contents.breadcrumbs.findIndex((crumb) => crumb.id === sharedFolder.id) + 1, 0)) : contents.breadcrumbs;
    return { room: { name: share.dataRoom.name, description: share.dataRoom.description }, shareDescription: share.description, scopeName: sharedFolder?.name ?? share.dataRoom.name, targetType: share.targetType, ...contents, breadcrumbs };
  }

  async userShareContents(shareId: string, recipientId: string, folderId?: string) {
    const share = await this.activeUserShare(shareId, recipientId);
    if (share.targetType === 'FILE') {
      if (!share.file) throw new NotFoundException('This shared file is unavailable');
      return { room: { name: share.dataRoom.name, description: share.dataRoom.description }, shareDescription: null, scopeName: share.file.name, targetType: 'FILE', folder: null, breadcrumbs: [], items: [{ ...share.file, kind: 'file', sizeBytes: share.file.sizeBytes.toString() }] };
    }
    const sharedFolder = share.targetType === 'FOLDER' ? share.folder : null;
    if (share.targetType === 'FOLDER' && !sharedFolder) throw new NotFoundException('This shared folder is unavailable');
    const requestedFolderId = folderId ?? sharedFolder?.id;
    if (sharedFolder && requestedFolderId) {
      const requested = await this.prisma.folder.findFirst({ where: { id: requestedFolderId, dataRoomId: share.dataRoomId, path: { startsWith: sharedFolder.path } }, select: { id: true } });
      if (!requested) throw new NotFoundException('This folder is outside the shared area');
    }
    const contents = await this.roomContents(share.dataRoomId, requestedFolderId);
    const breadcrumbs = sharedFolder ? contents.breadcrumbs.slice(Math.max(contents.breadcrumbs.findIndex((crumb) => crumb.id === sharedFolder.id) + 1, 0)) : contents.breadcrumbs;
    return { room: { name: share.dataRoom.name, description: share.dataRoom.description }, shareDescription: null, scopeName: sharedFolder?.name ?? share.dataRoom.name, targetType: share.targetType, ...contents, breadcrumbs };
  }

  async createPublicViewUrl(token: string, fileId: string) {
    const share = await this.activePublicShare(token);
    if (share.targetType === 'FILE' && share.fileId !== fileId) throw new NotFoundException('File not found');
    const where = share.targetType === 'FOLDER' && share.folder ? { id: fileId, dataRoomId: share.dataRoomId, folder: { path: { startsWith: share.folder.path } } } : { id: fileId, dataRoomId: share.dataRoomId };
    const file = await this.prisma.file.findFirst({ where });
    if (!file) throw new NotFoundException('File not found');
    return this.createStorageUrl(file.storagePath);
  }

  async createPublicDownloadUrl(token: string, fileId: string) {
    const share = await this.activePublicShare(token);
    if (share.targetType === 'FILE' && share.fileId !== fileId) throw new NotFoundException('File not found');
    const where = share.targetType === 'FOLDER' && share.folder ? { id: fileId, dataRoomId: share.dataRoomId, folder: { path: { startsWith: share.folder.path } } } : { id: fileId, dataRoomId: share.dataRoomId };
    const file = await this.prisma.file.findFirst({ where });
    if (!file) throw new NotFoundException('File not found');
    return this.createStorageUrl(file.storagePath, true);
  }

  async createUserShareViewUrl(shareId: string, recipientId: string, fileId: string) {
    const share = await this.activeUserShare(shareId, recipientId);
    const file = await this.sharedFile(share, fileId);
    return this.createStorageUrl(file.storagePath);
  }

  async createUserShareDownloadUrl(shareId: string, recipientId: string, fileId: string) {
    const share = await this.activeUserShare(shareId, recipientId);
    const file = await this.sharedFile(share, fileId);
    return this.createStorageUrl(file.storagePath, true);
  }

  private async roomContents(roomId: string, folderId?: string) {
    let folder: { id: string; name: string; parentId: string | null; path: string } | null = null;
    if (folderId) {
      folder = await this.prisma.folder.findFirst({ where: { id: folderId, dataRoomId: roomId }, select: { id: true, name: true, parentId: true, path: true } });
      if (!folder) throw new NotFoundException('Folder not found');
    }
    const [folders, files] = await this.prisma.$transaction([
      this.prisma.folder.findMany({ where: { dataRoomId: roomId, parentId: folderId ?? null }, orderBy: { name: 'asc' } }),
      this.prisma.file.findMany({ where: { dataRoomId: roomId, folderId: folderId ?? null }, orderBy: { name: 'asc' } }),
    ]);
    const breadcrumbs = folder ? await this.breadcrumbs(roomId, folder) : [];
    return { folder: folder && { id: folder.id, name: folder.name, parentId: folder.parentId }, breadcrumbs, items: [...folders.map((f) => ({ ...f, kind: 'folder' })), ...files.map((f) => ({ ...f, kind: 'file', sizeBytes: f.sizeBytes.toString() }))] };
  }

  async createFolder(roomId: string, ownerId: string, dto: CreateFolderDto) {
    await this.assertOwner(roomId, ownerId);
    const parent = dto.parentId ? await this.prisma.folder.findFirst({ where: { id: dto.parentId, dataRoomId: roomId } }) : null;
    if (dto.parentId && !parent) throw new NotFoundException('Parent folder not found');
    const id = crypto.randomUUID();
    const path = `${parent?.path ?? '/'}${id}/`;
    try {
      const folder = await this.prisma.folder.create({ data: { id, name: this.cleanFolderName(dto.name), dataRoomId: roomId, parentId: parent?.id, depth: (parent?.depth ?? -1) + 1, path } });
      await this.touchRoom(roomId);
      return folder;
    } catch (error: unknown) {
      if (this.isUniqueError(error)) throw new ConflictException('A folder with this name already exists here');
      throw error;
    }
  }

  async listFolders(roomId: string, ownerId: string) {
    await this.assertOwner(roomId, ownerId);
    return this.prisma.folder.findMany({ where: { dataRoomId: roomId }, select: { id: true, name: true, parentId: true, depth: true, path: true }, orderBy: { path: 'asc' } });
  }

  async renameFolder(roomId: string, ownerId: string, folderId: string, name: string) {
    await this.assertOwner(roomId, ownerId);
    const folder = await this.prisma.folder.findFirst({ where: { id: folderId, dataRoomId: roomId } });
    if (!folder) throw new NotFoundException('Folder not found');
    try {
      const renamed = await this.prisma.folder.update({ where: { id: folder.id }, data: { name: this.cleanFolderName(name) } });
      await this.touchRoom(roomId);
      return renamed;
    } catch (error) {
      if (this.isUniqueError(error)) throw new ConflictException('A folder with this name already exists here');
      throw error;
    }
  }

  async folderDeletionSummary(roomId: string, ownerId: string, folderId: string) {
    await this.assertOwner(roomId, ownerId);
    const folder = await this.prisma.folder.findFirst({ where: { id: folderId, dataRoomId: roomId } });
    if (!folder) throw new NotFoundException('Folder not found');
    const folders = await this.prisma.folder.findMany({ where: { dataRoomId: roomId, path: { startsWith: folder.path } }, select: { id: true } });
    const fileStats = await this.prisma.file.aggregate({ where: { dataRoomId: roomId, folderId: { in: folders.map((item) => item.id) } }, _count: { _all: true }, _sum: { sizeBytes: true } });
    return { folders: folders.length, files: fileStats._count._all, sizeBytes: (fileStats._sum.sizeBytes ?? BigInt(0)).toString() };
  }

  async deleteFolder(roomId: string, ownerId: string, folderId: string) {
    await this.assertOwner(roomId, ownerId);
    const folder = await this.prisma.folder.findFirst({ where: { id: folderId, dataRoomId: roomId } });
    if (!folder) throw new NotFoundException('Folder not found');
    const folders = await this.prisma.folder.findMany({ where: { dataRoomId: roomId, path: { startsWith: folder.path } }, select: { id: true } });
    const files = await this.prisma.file.findMany({ where: { dataRoomId: roomId, folderId: { in: folders.map((item) => item.id) } }, select: { id: true, storagePath: true } });
    await this.removeStorageObjects(files.map((file) => file.storagePath));
    await this.prisma.$transaction([
      this.prisma.file.deleteMany({ where: { id: { in: files.map((file) => file.id) } } }),
      this.prisma.folder.delete({ where: { id: folder.id } }),
      this.prisma.dataRoom.update({ where: { id: roomId }, data: { updatedAt: new Date() } }),
    ]);
    return { deleted: { folders: folders.length, files: files.length } };
  }

  async uploadFiles(roomId: string, ownerId: string, folderId: string | undefined, files: UploadFile[]) {
    await this.assertOwner(roomId, ownerId);
    if (!files.length) throw new BadRequestException('Choose at least one PDF to upload');
    if (files.length > 10) throw new BadRequestException('You can upload up to 10 files at once');
    if (folderId) {
      const folder = await this.prisma.folder.findFirst({ where: { id: folderId, dataRoomId: roomId } });
      if (!folder) throw new NotFoundException('Folder not found');
    }
    await this.ensureBucket();
    let pendingStoragePath: string | undefined;
    try {
      const result = [];
      for (const file of files) {
        this.assertPdf(file);
        const id = crypto.randomUUID();
        const storagePath = `${roomId}/${folderId ?? 'root'}/${id}.pdf`;
        const { error: uploadError } = await this.storage().storage.from(this.storageBucket).upload(storagePath, file.buffer, {
          contentType: 'application/pdf',
          upsert: false,
        });
        if (uploadError) throw new InternalServerErrorException('Unable to upload file to storage');
        pendingStoragePath = storagePath;
        const name = await this.nextAvailableName(roomId, folderId, this.cleanFileName(file.originalname));
        try {
          const created = await this.prisma.file.create({
            data: { id, dataRoomId: roomId, folderId: folderId ?? null, name, storagePath, mimeType: 'application/pdf', sizeBytes: BigInt(file.size) },
          });
          result.push({ ...created, sizeBytes: created.sizeBytes.toString() });
        } catch (error) {
          await this.storage().storage.from(this.storageBucket).remove([storagePath]);
          pendingStoragePath = undefined;
          if (this.isUniqueError(error)) throw new ConflictException('A file with this name was uploaded at the same time. Please try again.');
          throw error;
        }
        pendingStoragePath = undefined;
      }
      return result;
    } catch (error) {
      if (pendingStoragePath) await this.storage().storage.from(this.storageBucket).remove([pendingStoragePath]);
      throw error;
    }
  }

  async createViewUrl(roomId: string, ownerId: string, fileId: string) {
    await this.assertOwner(roomId, ownerId);
    const file = await this.prisma.file.findFirst({ where: { id: fileId, dataRoomId: roomId } });
    if (!file) throw new NotFoundException('File not found');
    return this.createStorageUrl(file.storagePath);
  }

  async createDownloadUrl(roomId: string, ownerId: string, fileId: string) {
    await this.assertOwner(roomId, ownerId);
    const file = await this.prisma.file.findFirst({ where: { id: fileId, dataRoomId: roomId } });
    if (!file) throw new NotFoundException('File not found');
    return this.createStorageUrl(file.storagePath, true);
  }

  async renameFile(roomId: string, ownerId: string, fileId: string, name: string) {
    await this.assertOwner(roomId, ownerId);
    const file = await this.prisma.file.findFirst({ where: { id: fileId, dataRoomId: roomId } });
    if (!file) throw new NotFoundException('File not found');
    const resolvedName = await this.nextAvailableName(roomId, file.folderId, this.cleanFileName(name), file.id);
    const renamed = await this.prisma.file.update({ where: { id: file.id }, data: { name: resolvedName } });
    await this.touchRoom(roomId);
    return { ...renamed, sizeBytes: renamed.sizeBytes.toString() };
  }

  async moveFile(roomId: string, ownerId: string, fileId: string, destinationFolderId: string | null | undefined) {
    await this.assertOwner(roomId, ownerId);
    const file = await this.prisma.file.findFirst({ where: { id: fileId, dataRoomId: roomId } });
    if (!file) throw new NotFoundException('File not found');
    if (destinationFolderId) {
      const folder = await this.prisma.folder.findFirst({ where: { id: destinationFolderId, dataRoomId: roomId } });
      if (!folder) throw new NotFoundException('Destination folder not found');
    }
    const destination = destinationFolderId ?? null;
    const name = await this.nextAvailableName(roomId, destination, file.name, file.id);
    const moved = await this.prisma.file.update({ where: { id: file.id }, data: { folderId: destination, name } });
    await this.touchRoom(roomId);
    return { ...moved, sizeBytes: moved.sizeBytes.toString() };
  }

  async moveFileToRoom(roomId: string, ownerId: string, fileId: string, destinationRoomId: string) {
    if (roomId === destinationRoomId) return this.moveFile(roomId, ownerId, fileId, null);
    await this.assertOwner(roomId, ownerId);
    await this.assertOwner(destinationRoomId, ownerId);
    const file = await this.prisma.file.findFirst({ where: { id: fileId, dataRoomId: roomId } });
    if (!file) throw new NotFoundException('File not found');
    const name = await this.nextAvailableName(destinationRoomId, null, file.name);
    const storagePath = `${destinationRoomId}/root/${crypto.randomUUID()}.pdf`;
    const { error: storageError } = await this.storage().storage.from(this.storageBucket).move(file.storagePath, storagePath);
    if (storageError) throw new InternalServerErrorException('Unable to move file in private storage');
    try {
      const moved = await this.prisma.$transaction(async (transaction) => {
        const updated = await transaction.file.update({ where: { id: file.id }, data: { dataRoomId: destinationRoomId, folderId: null, name, storagePath } });
        await transaction.share.updateMany({ where: { fileId: file.id }, data: { dataRoomId: destinationRoomId } });
        await transaction.dataRoom.updateMany({ where: { id: { in: [roomId, destinationRoomId] } }, data: { updatedAt: new Date() } });
        return updated;
      });
      return { ...moved, sizeBytes: moved.sizeBytes.toString() };
    } catch (error) {
      await this.storage().storage.from(this.storageBucket).move(storagePath, file.storagePath);
      throw error;
    }
  }

  async deleteFile(roomId: string, ownerId: string, fileId: string) {
    await this.assertOwner(roomId, ownerId);
    const file = await this.prisma.file.findFirst({ where: { id: fileId, dataRoomId: roomId } });
    if (!file) throw new NotFoundException('File not found');
    await this.removeStorageObjects([file.storagePath]);
    await this.prisma.file.delete({ where: { id: file.id } });
    await this.touchRoom(roomId);
    return { deleted: true };
  }

  private async assertOwner(roomId: string, ownerId: string) {
    const room = await this.prisma.dataRoom.findFirst({ where: { id: roomId, ownerId } });
    if (!room) throw new ForbiddenException('You do not have access to this Data Room');
    return room;
  }

  private shareTargetWhere(dto: CreatePublicShareDto) {
    if (dto.targetType === 'DATA_ROOM') return { targetType: 'DATA_ROOM' as const, folderId: null, fileId: null };
    if (dto.targetType === 'FOLDER') return { targetType: 'FOLDER' as const, folderId: dto.folderId ?? '', fileId: null };
    return { targetType: 'FILE' as const, folderId: null, fileId: dto.fileId ?? '' };
  }

  private async assertShareTarget(roomId: string, dto: CreatePublicShareDto) {
    if (dto.targetType === 'DATA_ROOM') {
      if (dto.folderId || dto.fileId) throw new BadRequestException('A Data Room share cannot include a folder or file');
      return;
    }
    if (dto.targetType === 'FOLDER') {
      if (!dto.folderId || dto.fileId) throw new BadRequestException('Choose one folder to share');
      const folder = await this.prisma.folder.findFirst({ where: { id: dto.folderId, dataRoomId: roomId }, select: { id: true } });
      if (!folder) throw new NotFoundException('Folder not found');
      return;
    }
    if (!dto.fileId || dto.folderId) throw new BadRequestException('Choose one file to share');
    const file = await this.prisma.file.findFirst({ where: { id: dto.fileId, dataRoomId: roomId }, select: { id: true } });
    if (!file) throw new NotFoundException('File not found');
  }

  private async activePublicShare(token: string) {
    const share = await this.prisma.share.findFirst({
      where: { token, accessType: 'PUBLIC_LINK', revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      include: {
        dataRoom: { select: { name: true, description: true } },
        folder: { select: { id: true, name: true, path: true } },
        file: { select: { id: true, name: true, storagePath: true, mimeType: true, sizeBytes: true, createdAt: true, updatedAt: true, folderId: true } },
      },
    });
    if (!share) throw new NotFoundException('This shared link is unavailable or has been revoked');
    return share;
  }

  private async activeUserShare(shareId: string, recipientId: string) {
    const share = await this.prisma.share.findFirst({
      where: { id: shareId, recipientId, accessType: 'USER', revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      include: {
        dataRoom: { select: { name: true, description: true } },
        folder: { select: { id: true, name: true, path: true } },
        file: { select: { id: true, name: true, storagePath: true, mimeType: true, sizeBytes: true, createdAt: true, updatedAt: true, folderId: true } },
      },
    });
    if (!share) throw new NotFoundException('This shared access is unavailable or has been revoked');
    return share;
  }

  private async sharedFile(share: Awaited<ReturnType<DataRoomsService['activeUserShare']>>, fileId: string) {
    if (share.targetType === 'FILE' && share.fileId !== fileId) throw new NotFoundException('File not found');
    const where = share.targetType === 'FOLDER' && share.folder ? { id: fileId, dataRoomId: share.dataRoomId, folder: { path: { startsWith: share.folder.path } } } : { id: fileId, dataRoomId: share.dataRoomId };
    const file = await this.prisma.file.findFirst({ where });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  private async breadcrumbs(roomId: string, folder: { id: string; name: string; parentId: string | null; path: string }) {
    const ids = folder.path.split('/').filter(Boolean);
    return this.prisma.folder.findMany({ where: { id: { in: ids }, dataRoomId: roomId }, select: { id: true, name: true } }).then((rows) => ids.map((id) => rows.find((row) => row.id === id)).filter((row): row is { id: string; name: string } => Boolean(row)));
  }

  private storage() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new InternalServerErrorException('Supabase storage is not configured');
    return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  }

  private async createStorageUrl(storagePath: string, download = false) {
    const { data, error } = await this.storage().storage.from(this.storageBucket).createSignedUrl(storagePath, 10 * 60, download ? { download: true } : undefined);
    if (error || !data) throw new NotFoundException('The stored file is no longer available');
    return { url: data.signedUrl, expiresIn: 600 };
  }

  private async ensureBucket() {
    if (this.bucketReady) return;
    const client = this.storage();
    const { data, error } = await client.storage.listBuckets();
    if (error) throw new InternalServerErrorException('Unable to access file storage');
    if (!data.some((bucket) => bucket.id === this.storageBucket)) {
      const { error: createError } = await client.storage.createBucket(this.storageBucket, { public: false, fileSizeLimit: '26214400', allowedMimeTypes: ['application/pdf'] });
      if (createError && !/already exists/i.test(createError.message)) throw new InternalServerErrorException('Unable to create private file storage');
    }
    this.bucketReady = true;
  }

  private async removeStorageObjects(paths: string[]) {
    const client = this.storage();
    for (let index = 0; index < paths.length; index += 100) {
      const { error } = await client.storage.from(this.storageBucket).remove(paths.slice(index, index + 100));
      if (error) throw new InternalServerErrorException('Unable to remove file storage objects');
    }
  }

  private assertPdf(file: UploadFile) {
    const header = file.buffer.subarray(0, 4).toString('ascii');
    if (!file.originalname.toLowerCase().endsWith('.pdf') || header !== '%PDF') throw new BadRequestException(`${file.originalname} is not a valid PDF`);
    if (file.size > 25 * 1024 * 1024) throw new BadRequestException(`${file.originalname} exceeds the 25 MB limit`);
  }

  private cleanFileName(name: string) {
    const cleaned = name.trim().replace(/[\\/]/g, '-').replace(/\s+/g, ' ');
    if (!cleaned || cleaned.length > 180) throw new BadRequestException('File name must contain 1–180 characters');
    return cleaned;
  }

  private cleanFolderName(name: string) {
    const cleaned = name.trim().replace(/[\\/]/g, '-').replace(/\s+/g, ' ');
    if (!cleaned || cleaned.length > 180) throw new BadRequestException('Folder name must contain 1–180 characters');
    return cleaned;
  }

  private cleanRoomName(name: string) {
    const cleaned = name.trim().replace(/\s+/g, ' ');
    if (!cleaned || cleaned.length > 120) throw new BadRequestException('Data Room name must contain 1–120 characters');
    return cleaned;
  }

  private async nextAvailableName(roomId: string, folderId: string | null | undefined, original: string, excludedFileId?: string) {
    const extensionAt = original.lastIndexOf('.');
    const stem = extensionAt > 0 ? original.slice(0, extensionAt) : original;
    const extension = extensionAt > 0 ? original.slice(extensionAt) : '';
    for (let index = 0; index < 1000; index += 1) {
      const name = index ? `${stem} (${index})${extension}` : original;
      const match = await this.prisma.file.findFirst({ where: { dataRoomId: roomId, folderId: folderId ?? null, name, ...(excludedFileId ? { id: { not: excludedFileId } } : {}) }, select: { id: true } });
      if (!match) return name;
    }
    throw new ConflictException('Too many files with the same name in this folder');
  }

  private isUniqueError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002';
  }

  private touchRoom(roomId: string) {
    return this.prisma.dataRoom.update({ where: { id: roomId }, data: { updatedAt: new Date() } });
  }
}

interface UploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
