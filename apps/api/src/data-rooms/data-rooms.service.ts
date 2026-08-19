import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ShareAccessType, ShareRole, ShareTargetType } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDataRoomDto } from './dto/create-data-room.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { CreatePublicShareDto } from './dto/create-public-share.dto';
import { GrantUserShareDto } from './dto/grant-user-share.dto';
import { ContentsQueryDto } from './dto/contents-query.dto';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { SearchFilesDto } from './dto/search-files.dto';
import { ApiMessages } from '../common/messages';
import {
  clampPageSize,
  hasFileExtension,
  isAlreadyExistsError,
  isExpectedMimeType,
  isValidUploadSize,
  isUniqueConstraintError,
  normalizeItemName,
  normalizeRoomName,
  ValidationLimits,
} from '../common/helpers/validation';
import {
  decodeContentsCursor,
  decodeFileSearchCursor,
  encodeCursor,
  type ContentsCursor,
  type FileSearchCursor,
} from '../common/helpers/cursor';
import { DataRoomStorage } from './data-rooms.constants';

@Injectable()
export class DataRoomsService {
  private readonly storageBucket = DataRoomStorage.bucket;
  private bucketReady = false;

  constructor(private readonly prisma: PrismaService) {}

  async list(ownerId: string) {
    return this.prisma.dataRoom.findMany({ where: { ownerId }, orderBy: { updatedAt: 'desc' } });
  }

  async create(ownerId: string, email: string, dto: CreateDataRoomDto) {
    await this.prisma.user.upsert({
      where: { id: ownerId },
      update: { email },
      create: { id: ownerId, email },
    });
    return this.prisma.dataRoom.create({
      data: {
        name: this.cleanRoomName(dto.name),
        description: dto.description?.trim() || null,
        ownerId,
      },
    });
  }

  async renameRoom(roomId: string, ownerId: string, dto: CreateDataRoomDto) {
    await this.assertOwner(roomId, ownerId);
    return this.prisma.dataRoom.update({
      where: { id: roomId },
      data: { name: this.cleanRoomName(dto.name), description: dto.description?.trim() || null },
    });
  }

  async deleteRoom(roomId: string, ownerId: string) {
    await this.assertOwner(roomId, ownerId);
    const [files, uploads] = await this.prisma.$transaction([
      this.prisma.file.findMany({ where: { dataRoomId: roomId }, select: { storagePath: true } }),
      this.prisma.uploadSession.findMany({
        where: { dataRoomId: roomId },
        select: { storagePath: true },
      }),
    ]);
    await this.removeStorageObjects([...files, ...uploads].map((item) => item.storagePath));
    await this.prisma.dataRoom.delete({ where: { id: roomId } });
    return { deleted: { files: files.length } };
  }

  async contents(roomId: string, ownerId: string, dto: ContentsQueryDto) {
    await this.assertOwner(roomId, ownerId);
    return this.roomContents(roomId, dto);
  }

  async searchFiles(roomId: string, ownerId: string, dto: SearchFilesDto) {
    await this.assertOwner(roomId, ownerId);
    const cursor = this.decodeFileSearchCursor(dto.cursor);
    const limit = clampPageSize(dto.limit);
    const files = await this.prisma.file.findMany({
      where: {
        dataRoomId: roomId,
        name: { contains: dto.query, mode: 'insensitive' },
        ...(cursor
          ? { OR: [{ name: { gt: cursor.name } }, { name: cursor.name, id: { gt: cursor.id } }] }
          : {}),
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });
    const visibleFiles = files.slice(0, limit);
    const lastFile = visibleFiles.at(-1);
    return {
      items: visibleFiles.map((file) => this.serializeFile(file)),
      nextCursor: files.length > limit && lastFile ? this.encodeFileSearchCursor(lastFile) : null,
    };
  }

  async listPublicShares(roomId: string, ownerId: string, dto: CreatePublicShareDto) {
    await this.assertOwner(roomId, ownerId);
    return this.prisma.share.findMany({
      where: {
        dataRoomId: roomId,
        ...this.shareTargetWhere(dto),
        accessType: ShareAccessType.PUBLIC_LINK,
        revokedAt: null,
      },
      select: { id: true, token: true, description: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPublicShare(roomId: string, ownerId: string, dto: CreatePublicShareDto) {
    await this.assertOwner(roomId, ownerId);
    await this.assertShareTarget(roomId, dto);
    return this.prisma.share.create({
      data: {
        dataRoomId: roomId,
        targetType: dto.targetType,
        accessType: ShareAccessType.PUBLIC_LINK,
        role: ShareRole.VIEWER,
        token: randomBytes(32).toString('base64url'),
        description: dto.description?.trim() || null,
        folderId: dto.targetType === ShareTargetType.FOLDER ? dto.folderId : null,
        fileId: dto.targetType === ShareTargetType.FILE ? dto.fileId : null,
      },
      select: { id: true, token: true, description: true, createdAt: true },
    });
  }

  async revokePublicShare(roomId: string, ownerId: string, shareId: string) {
    await this.assertOwner(roomId, ownerId);
    const share = await this.prisma.share.findFirst({
      where: {
        id: shareId,
        dataRoomId: roomId,
        accessType: ShareAccessType.PUBLIC_LINK,
        revokedAt: null,
      },
    });
    if (!share) throw new NotFoundException(ApiMessages.shares.publicLinkNotFound);
    await this.prisma.share.update({ where: { id: shareId }, data: { revokedAt: new Date() } });
    return { revoked: true };
  }

  async listUserShares(roomId: string, ownerId: string, dto: CreatePublicShareDto) {
    await this.assertOwner(roomId, ownerId);
    return this.prisma.share
      .findMany({
        where: {
          dataRoomId: roomId,
          ...this.shareTargetWhere(dto),
          accessType: ShareAccessType.USER,
          revokedAt: null,
        },
        select: {
          id: true,
          createdAt: true,
          recipientId: true,
          recipientEmail: true,
          recipient: { select: { email: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      .then((shares) =>
        shares.map((share) => ({
          id: share.id,
          email: share.recipient?.email ?? share.recipientEmail ?? '',
          pending: !share.recipientId,
          createdAt: share.createdAt,
        })),
      );
  }

  async grantUserShare(roomId: string, ownerId: string, dto: GrantUserShareDto) {
    await this.assertOwner(roomId, ownerId);
    await this.assertShareTarget(roomId, dto);
    const email = dto.email.trim().toLowerCase();
    const recipient = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (recipient?.id === ownerId)
      throw new BadRequestException(ApiMessages.shares.ownerAlreadyHasAccess);
    const where = {
      dataRoomId: roomId,
      ...this.shareTargetWhere(dto),
      accessType: ShareAccessType.USER,
      revokedAt: null,
      OR: recipient
        ? [{ recipientId: recipient.id }, { recipientEmail: email }]
        : [{ recipientEmail: email }],
    };
    const existing = await this.prisma.share.findFirst({
      where,
      select: { id: true, createdAt: true },
    });
    if (existing) return { ...existing, email, pending: !recipient };
    const share = await this.prisma.share.create({
      data: {
        dataRoomId: roomId,
        targetType: dto.targetType,
        accessType: ShareAccessType.USER,
        role: ShareRole.VIEWER,
        recipientId: recipient?.id,
        recipientEmail: email,
        folderId: dto.targetType === ShareTargetType.FOLDER ? dto.folderId : null,
        fileId: dto.targetType === ShareTargetType.FILE ? dto.fileId : null,
      },
      select: { id: true, createdAt: true },
    });
    return { ...share, email, pending: !recipient };
  }

  async revokeUserShare(roomId: string, ownerId: string, shareId: string) {
    await this.assertOwner(roomId, ownerId);
    const share = await this.prisma.share.findFirst({
      where: {
        id: shareId,
        dataRoomId: roomId,
        accessType: ShareAccessType.USER,
        revokedAt: null,
      },
    });
    if (!share) throw new NotFoundException(ApiMessages.shares.userAccessNotFound);
    await this.prisma.share.update({ where: { id: shareId }, data: { revokedAt: new Date() } });
    return { revoked: true };
  }

  async sharedWithMe(recipientId: string) {
    const shares = await this.prisma.share.findMany({
      where: {
        recipientId,
        accessType: ShareAccessType.USER,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        dataRoom: { select: { name: true, owner: { select: { email: true } } } },
        folder: { select: { name: true } },
        file: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return shares.map((share) => ({
      id: share.id,
      targetType: share.targetType,
      targetName: share.folder?.name ?? share.file?.name ?? share.dataRoom.name,
      roomName: share.dataRoom.name,
      sharedBy: share.dataRoom.owner.email,
      createdAt: share.createdAt,
    }));
  }

  async publicContents(token: string, dto: ContentsQueryDto) {
    const share = await this.activePublicShare(token);
    if (share.targetType === ShareTargetType.FILE) {
      if (!share.file) throw new NotFoundException(ApiMessages.shares.sharedFileUnavailable);
      return {
        room: { name: share.dataRoom.name, description: share.dataRoom.description },
        shareDescription: share.description,
        scopeName: share.file.name,
        targetType: ShareTargetType.FILE,
        folder: null,
        breadcrumbs: [],
        items: [
          {
            ...share.file,
            parentId: share.file.folderId,
            kind: 'file',
            sizeBytes: share.file.sizeBytes.toString(),
          },
        ],
        nextCursor: null,
      };
    }
    const sharedFolder = share.targetType === ShareTargetType.FOLDER ? share.folder : null;
    if (share.targetType === ShareTargetType.FOLDER && !sharedFolder)
      throw new NotFoundException(ApiMessages.shares.sharedFolderUnavailable);
    const requestedFolderId = dto.folderId ?? sharedFolder?.id;
    if (sharedFolder && requestedFolderId) {
      const requested = await this.prisma.folder.findFirst({
        where: {
          id: requestedFolderId,
          dataRoomId: share.dataRoomId,
          path: { startsWith: sharedFolder.path },
        },
        select: { id: true },
      });
      if (!requested) throw new NotFoundException(ApiMessages.shares.folderOutsideSharedArea);
    }
    const contents = await this.roomContents(share.dataRoomId, {
      ...dto,
      folderId: requestedFolderId,
    });
    const breadcrumbs = sharedFolder
      ? contents.breadcrumbs.slice(
          Math.max(contents.breadcrumbs.findIndex((crumb) => crumb.id === sharedFolder.id) + 1, 0),
        )
      : contents.breadcrumbs;
    return {
      room: { name: share.dataRoom.name, description: share.dataRoom.description },
      shareDescription: share.description,
      scopeName: sharedFolder?.name ?? share.dataRoom.name,
      targetType: share.targetType,
      ...contents,
      breadcrumbs,
    };
  }

  async userShareContents(shareId: string, recipientId: string, dto: ContentsQueryDto) {
    const share = await this.activeUserShare(shareId, recipientId);
    if (share.targetType === ShareTargetType.FILE) {
      if (!share.file) throw new NotFoundException(ApiMessages.shares.sharedFileUnavailable);
      return {
        room: { name: share.dataRoom.name, description: share.dataRoom.description },
        shareDescription: null,
        scopeName: share.file.name,
        targetType: ShareTargetType.FILE,
        folder: null,
        breadcrumbs: [],
        items: [
          {
            ...share.file,
            parentId: share.file.folderId,
            kind: 'file',
            sizeBytes: share.file.sizeBytes.toString(),
          },
        ],
        nextCursor: null,
      };
    }
    const sharedFolder = share.targetType === ShareTargetType.FOLDER ? share.folder : null;
    if (share.targetType === ShareTargetType.FOLDER && !sharedFolder)
      throw new NotFoundException(ApiMessages.shares.sharedFolderUnavailable);
    const requestedFolderId = dto.folderId ?? sharedFolder?.id;
    if (sharedFolder && requestedFolderId) {
      const requested = await this.prisma.folder.findFirst({
        where: {
          id: requestedFolderId,
          dataRoomId: share.dataRoomId,
          path: { startsWith: sharedFolder.path },
        },
        select: { id: true },
      });
      if (!requested) throw new NotFoundException(ApiMessages.shares.folderOutsideSharedArea);
    }
    const contents = await this.roomContents(share.dataRoomId, {
      ...dto,
      folderId: requestedFolderId,
    });
    const breadcrumbs = sharedFolder
      ? contents.breadcrumbs.slice(
          Math.max(contents.breadcrumbs.findIndex((crumb) => crumb.id === sharedFolder.id) + 1, 0),
        )
      : contents.breadcrumbs;
    return {
      room: { name: share.dataRoom.name, description: share.dataRoom.description },
      shareDescription: null,
      scopeName: sharedFolder?.name ?? share.dataRoom.name,
      targetType: share.targetType,
      ...contents,
      breadcrumbs,
    };
  }

  async createPublicViewUrl(token: string, fileId: string) {
    const share = await this.activePublicShare(token);
    if (share.targetType === ShareTargetType.FILE && share.fileId !== fileId)
      throw new NotFoundException(ApiMessages.resources.fileNotFound);
    const where =
      share.targetType === ShareTargetType.FOLDER && share.folder
        ? {
            id: fileId,
            dataRoomId: share.dataRoomId,
            folder: { path: { startsWith: share.folder.path } },
          }
        : { id: fileId, dataRoomId: share.dataRoomId };
    const file = await this.prisma.file.findFirst({ where });
    if (!file) throw new NotFoundException(ApiMessages.resources.fileNotFound);
    return this.createStorageUrl(file.storagePath);
  }

  async createPublicDownloadUrl(token: string, fileId: string) {
    const share = await this.activePublicShare(token);
    if (share.targetType === ShareTargetType.FILE && share.fileId !== fileId)
      throw new NotFoundException(ApiMessages.resources.fileNotFound);
    const where =
      share.targetType === ShareTargetType.FOLDER && share.folder
        ? {
            id: fileId,
            dataRoomId: share.dataRoomId,
            folder: { path: { startsWith: share.folder.path } },
          }
        : { id: fileId, dataRoomId: share.dataRoomId };
    const file = await this.prisma.file.findFirst({ where });
    if (!file) throw new NotFoundException(ApiMessages.resources.fileNotFound);
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

  private async roomContents(roomId: string, dto: ContentsQueryDto) {
    const folderId = dto.folderId;
    let folder: { id: string; name: string; parentId: string | null; path: string } | null = null;
    if (folderId) {
      folder = await this.prisma.folder.findFirst({
        where: { id: folderId, dataRoomId: roomId },
        select: { id: true, name: true, parentId: true, path: true },
      });
      if (!folder) throw new NotFoundException(ApiMessages.resources.folderNotFound);
    }
    const { items, nextCursor } = await this.listDirectChildren(
      roomId,
      folderId ?? null,
      dto.cursor,
      dto.limit ?? 50,
    );
    const breadcrumbs = folder ? await this.breadcrumbs(roomId, folder) : [];
    return {
      folder: folder && { id: folder.id, name: folder.name, parentId: folder.parentId },
      breadcrumbs,
      items,
      nextCursor,
    };
  }

  async createFolder(roomId: string, ownerId: string, dto: CreateFolderDto) {
    await this.assertOwner(roomId, ownerId);
    const parent = dto.parentId
      ? await this.prisma.folder.findFirst({ where: { id: dto.parentId, dataRoomId: roomId } })
      : null;
    if (dto.parentId && !parent)
      throw new NotFoundException(ApiMessages.resources.parentFolderNotFound);
    const id = crypto.randomUUID();
    const path = `${parent?.path ?? DataRoomStorage.rootPath}${id}/`;
    try {
      const folder = await this.prisma.folder.create({
        data: {
          id,
          name: this.cleanFolderName(dto.name),
          dataRoomId: roomId,
          parentId: parent?.id,
          depth: (parent?.depth ?? -1) + 1,
          path,
        },
      });
      await this.touchRoom(roomId);
      return folder;
    } catch (error: unknown) {
      if (isUniqueConstraintError(error))
        throw new ConflictException(ApiMessages.resources.folderNameConflict);
      throw error;
    }
  }

  async listFolders(roomId: string, ownerId: string, parentId?: string) {
    await this.assertOwner(roomId, ownerId);
    const folders = await this.prisma.folder.findMany({
      where: { dataRoomId: roomId, parentId: parentId ?? null },
      select: {
        id: true,
        name: true,
        parentId: true,
        depth: true,
        children: { select: { id: true }, take: 1 },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    return folders.map(({ children, ...folder }) => ({
      ...folder,
      hasChildren: children.length > 0,
    }));
  }

  async listFolderOptions(roomId: string, ownerId: string) {
    await this.assertOwner(roomId, ownerId);
    return this.prisma.folder.findMany({
      where: { dataRoomId: roomId },
      select: { id: true, name: true, parentId: true, depth: true },
      orderBy: { path: 'asc' },
    });
  }

  async renameFolder(roomId: string, ownerId: string, folderId: string, name: string) {
    await this.assertOwner(roomId, ownerId);
    const folder = await this.prisma.folder.findFirst({
      where: { id: folderId, dataRoomId: roomId },
    });
    if (!folder) throw new NotFoundException(ApiMessages.resources.folderNotFound);
    try {
      const renamed = await this.prisma.folder.update({
        where: { id: folder.id },
        data: { name: this.cleanFolderName(name) },
      });
      await this.touchRoom(roomId);
      return renamed;
    } catch (error) {
      if (isUniqueConstraintError(error))
        throw new ConflictException(ApiMessages.resources.folderNameConflict);
      throw error;
    }
  }

  async folderDeletionSummary(roomId: string, ownerId: string, folderId: string) {
    await this.assertOwner(roomId, ownerId);
    const folder = await this.prisma.folder.findFirst({
      where: { id: folderId, dataRoomId: roomId },
    });
    if (!folder) throw new NotFoundException(ApiMessages.resources.folderNotFound);
    const folders = await this.prisma.folder.findMany({
      where: { dataRoomId: roomId, path: { startsWith: folder.path } },
      select: { id: true },
    });
    const fileStats = await this.prisma.file.aggregate({
      where: { dataRoomId: roomId, folderId: { in: folders.map((item) => item.id) } },
      _count: { _all: true },
      _sum: { sizeBytes: true },
    });
    return {
      folders: folders.length,
      files: fileStats._count._all,
      sizeBytes: (fileStats._sum.sizeBytes ?? BigInt(0)).toString(),
    };
  }

  async deleteFolder(roomId: string, ownerId: string, folderId: string) {
    await this.assertOwner(roomId, ownerId);
    const folder = await this.prisma.folder.findFirst({
      where: { id: folderId, dataRoomId: roomId },
    });
    if (!folder) throw new NotFoundException(ApiMessages.resources.folderNotFound);
    const folders = await this.prisma.folder.findMany({
      where: { dataRoomId: roomId, path: { startsWith: folder.path } },
      select: { id: true },
    });
    const folderIds = folders.map((item) => item.id);
    const [files, uploads] = await this.prisma.$transaction([
      this.prisma.file.findMany({
        where: { dataRoomId: roomId, folderId: { in: folderIds } },
        select: { id: true, storagePath: true },
      }),
      this.prisma.uploadSession.findMany({
        where: { dataRoomId: roomId, folderId: { in: folderIds } },
        select: { storagePath: true },
      }),
    ]);
    await this.removeStorageObjects([...files, ...uploads].map((item) => item.storagePath));
    await this.prisma.$transaction([
      this.prisma.file.deleteMany({ where: { id: { in: files.map((file) => file.id) } } }),
      this.prisma.folder.delete({ where: { id: folder.id } }),
      this.prisma.dataRoom.update({ where: { id: roomId }, data: { updatedAt: new Date() } }),
    ]);
    return { deleted: { folders: folders.length, files: files.length } };
  }

  async createUploadUrl(roomId: string, ownerId: string, dto: CreateUploadUrlDto) {
    await this.assertOwner(roomId, ownerId);
    const name = this.validateUploadCandidate(dto.name, dto.sizeBytes);
    if (dto.folderId) {
      const folder = await this.prisma.folder.findFirst({
        where: { id: dto.folderId, dataRoomId: roomId },
      });
      if (!folder) throw new NotFoundException(ApiMessages.resources.folderNotFound);
    }
    await this.ensureBucket();
    const uploadId = crypto.randomUUID();
    const storagePath = `${roomId}/${dto.folderId ?? DataRoomStorage.rootFolder}/${uploadId}${DataRoomStorage.upload.extension}`;
    const expiresAt = new Date(Date.now() + DataRoomStorage.uploadSessionTtlMilliseconds);
    await this.prisma.uploadSession.create({
      data: {
        id: uploadId,
        dataRoomId: roomId,
        folderId: dto.folderId ?? null,
        ownerId,
        name,
        storagePath,
        sizeBytes: BigInt(dto.sizeBytes),
        expiresAt,
      },
    });
    try {
      const { data, error } = await this.storage()
        .storage.from(this.storageBucket)
        .createSignedUploadUrl(storagePath);
      if (error || !data)
        throw new InternalServerErrorException(ApiMessages.uploads.unableToPrepare);
      return { uploadId, signedUrl: data.signedUrl, expiresAt: expiresAt.toISOString() };
    } catch (error) {
      await this.prisma.uploadSession.delete({ where: { id: uploadId } }).catch(() => undefined);
      throw error;
    }
  }

  async completeUpload(roomId: string, ownerId: string, uploadId: string) {
    const completed = await this.prisma.file.findFirst({
      where: { id: uploadId, dataRoomId: roomId },
      select: {
        id: true,
        name: true,
        folderId: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (completed) return this.serializeFile(completed);

    const upload = await this.prisma.uploadSession.findFirst({
      where: { id: uploadId, dataRoomId: roomId, ownerId },
    });
    if (!upload) throw new NotFoundException(ApiMessages.uploads.sessionNotFound);
    if (upload.expiresAt <= new Date()) {
      await this.discardUpload(upload);
      throw new BadRequestException(ApiMessages.uploads.sessionExpired);
    }

    const { data: storedFile, error } = await this.storage()
      .storage.from(this.storageBucket)
      .info(upload.storagePath);
    const expectedSize = Number(upload.sizeBytes);
    const isPdf = isExpectedMimeType(storedFile?.contentType, DataRoomStorage.upload.mimeType);
    if (error || !storedFile || storedFile.size !== expectedSize || !isPdf) {
      await this.discardUpload(upload);
      throw new BadRequestException(ApiMessages.uploads.verificationFailed);
    }

    try {
      const created = await this.withAvailableFileName(
        roomId,
        upload.folderId,
        upload.name,
        undefined,
        (name) =>
          this.prisma.$transaction(async (transaction) => {
            await transaction.uploadSession.delete({ where: { id: upload.id } });
            return transaction.file.create({
              data: {
                id: upload.id,
                dataRoomId: roomId,
                folderId: upload.folderId,
                name,
                storagePath: upload.storagePath,
                mimeType: DataRoomStorage.upload.mimeType,
                sizeBytes: upload.sizeBytes,
              },
            });
          }),
      );
      await this.touchRoom(roomId);
      return this.serializeFile(created);
    } catch (error) {
      const alreadyCompleted = await this.prisma.file.findFirst({
        where: { id: uploadId, dataRoomId: roomId },
        select: {
          id: true,
          name: true,
          folderId: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (alreadyCompleted) return this.serializeFile(alreadyCompleted);
      throw error;
    }
  }

  async cancelUpload(roomId: string, ownerId: string, uploadId: string) {
    const upload = await this.prisma.uploadSession.findFirst({
      where: { id: uploadId, dataRoomId: roomId, ownerId },
    });
    if (!upload) return { deleted: false };
    await this.discardUpload(upload);
    return { deleted: true };
  }

  /**
   * Removes objects left behind when a signed direct-upload URL expires before
   * it is completed. Storage is deleted first: a failed storage request keeps
   * the session so the next run can retry without orphaning an object.
   */
  async cleanupExpiredUploads(limit = 500) {
    const expiresBefore = new Date();
    const uploads = await this.prisma.uploadSession.findMany({
      where: { expiresAt: { lt: expiresBefore } },
      orderBy: { expiresAt: 'asc' },
      take: limit,
      select: { id: true, storagePath: true },
    });
    let cleaned = 0;
    let failed = 0;

    for (let index = 0; index < uploads.length; index += 100) {
      const batch = uploads.slice(index, index + DataRoomStorage.maxObjectsPerDelete);
      try {
        await this.removeStorageObjects(batch.map((upload) => upload.storagePath));
        const result = await this.prisma.uploadSession.deleteMany({
          where: {
            id: { in: batch.map((upload) => upload.id) },
            expiresAt: { lt: expiresBefore },
          },
        });
        cleaned += result.count;
      } catch (error) {
        failed += batch.length;
        console.error('Unable to clean up expired upload sessions', error);
      }
    }

    return {
      scanned: uploads.length,
      cleaned,
      failed,
      hasMore: uploads.length === limit,
    };
  }

  async createViewUrl(roomId: string, ownerId: string, fileId: string) {
    await this.assertOwner(roomId, ownerId);
    const file = await this.prisma.file.findFirst({ where: { id: fileId, dataRoomId: roomId } });
    if (!file) throw new NotFoundException(ApiMessages.resources.fileNotFound);
    return this.createStorageUrl(file.storagePath);
  }

  async createDownloadUrl(roomId: string, ownerId: string, fileId: string) {
    await this.assertOwner(roomId, ownerId);
    const file = await this.prisma.file.findFirst({ where: { id: fileId, dataRoomId: roomId } });
    if (!file) throw new NotFoundException(ApiMessages.resources.fileNotFound);
    return this.createStorageUrl(file.storagePath, true);
  }

  async renameFile(roomId: string, ownerId: string, fileId: string, name: string) {
    await this.assertOwner(roomId, ownerId);
    const file = await this.prisma.file.findFirst({ where: { id: fileId, dataRoomId: roomId } });
    if (!file) throw new NotFoundException(ApiMessages.resources.fileNotFound);
    const renamed = await this.withAvailableFileName(
      roomId,
      file.folderId,
      this.cleanFileName(name),
      file.id,
      (resolvedName) =>
        this.prisma.file.update({ where: { id: file.id }, data: { name: resolvedName } }),
    );
    await this.touchRoom(roomId);
    return { ...renamed, sizeBytes: renamed.sizeBytes.toString() };
  }

  async moveFile(
    roomId: string,
    ownerId: string,
    fileId: string,
    destinationFolderId: string | null | undefined,
  ) {
    await this.assertOwner(roomId, ownerId);
    const file = await this.prisma.file.findFirst({ where: { id: fileId, dataRoomId: roomId } });
    if (!file) throw new NotFoundException(ApiMessages.resources.fileNotFound);
    if (destinationFolderId) {
      const folder = await this.prisma.folder.findFirst({
        where: { id: destinationFolderId, dataRoomId: roomId },
      });
      if (!folder) throw new NotFoundException(ApiMessages.resources.destinationFolderNotFound);
    }
    const destination = destinationFolderId ?? null;
    if (file.folderId === destination) return { ...file, sizeBytes: file.sizeBytes.toString() };
    const moved = await this.withAvailableFileName(
      roomId,
      destination,
      file.name,
      file.id,
      (name) =>
        this.prisma.file.update({ where: { id: file.id }, data: { folderId: destination, name } }),
    );
    await this.touchRoom(roomId);
    return { ...moved, sizeBytes: moved.sizeBytes.toString() };
  }

  async moveFileToRoom(roomId: string, ownerId: string, fileId: string, destinationRoomId: string) {
    if (roomId === destinationRoomId) return this.moveFile(roomId, ownerId, fileId, null);
    await this.assertOwner(roomId, ownerId);
    await this.assertOwner(destinationRoomId, ownerId);
    const file = await this.prisma.file.findFirst({ where: { id: fileId, dataRoomId: roomId } });
    if (!file) throw new NotFoundException(ApiMessages.resources.fileNotFound);
    const storagePath = `${destinationRoomId}/${DataRoomStorage.rootFolder}/${crypto.randomUUID()}${DataRoomStorage.upload.extension}`;
    const { error: storageError } = await this.storage()
      .storage.from(this.storageBucket)
      .move(file.storagePath, storagePath);
    if (storageError) throw new InternalServerErrorException(ApiMessages.uploads.unableToMove);
    try {
      const moved = await this.withAvailableFileName(
        destinationRoomId,
        null,
        file.name,
        undefined,
        (name) =>
          this.prisma.$transaction(async (transaction) => {
            const updated = await transaction.file.update({
              where: { id: file.id },
              data: { dataRoomId: destinationRoomId, folderId: null, name, storagePath },
            });
            await transaction.share.updateMany({
              where: { fileId: file.id },
              data: { dataRoomId: destinationRoomId },
            });
            await transaction.dataRoom.updateMany({
              where: { id: { in: [roomId, destinationRoomId] } },
              data: { updatedAt: new Date() },
            });
            return updated;
          }),
      );
      return { ...moved, sizeBytes: moved.sizeBytes.toString() };
    } catch (error) {
      await this.storage().storage.from(this.storageBucket).move(storagePath, file.storagePath);
      throw error;
    }
  }

  async deleteFile(roomId: string, ownerId: string, fileId: string) {
    await this.assertOwner(roomId, ownerId);
    const file = await this.prisma.file.findFirst({ where: { id: fileId, dataRoomId: roomId } });
    if (!file) throw new NotFoundException(ApiMessages.resources.fileNotFound);
    await this.removeStorageObjects([file.storagePath]);
    await this.prisma.file.delete({ where: { id: file.id } });
    await this.touchRoom(roomId);
    return { deleted: true };
  }

  private async assertOwner(roomId: string, ownerId: string) {
    const room = await this.prisma.dataRoom.findFirst({ where: { id: roomId, ownerId } });
    if (!room) throw new ForbiddenException(ApiMessages.authorization.roomAccessDenied);
    return room;
  }

  private shareTargetWhere(dto: CreatePublicShareDto) {
    if (dto.targetType === ShareTargetType.DATA_ROOM)
      return { targetType: ShareTargetType.DATA_ROOM, folderId: null, fileId: null };
    if (dto.targetType === ShareTargetType.FOLDER)
      return { targetType: ShareTargetType.FOLDER, folderId: dto.folderId ?? '', fileId: null };
    return { targetType: ShareTargetType.FILE, folderId: null, fileId: dto.fileId ?? '' };
  }

  private async assertShareTarget(roomId: string, dto: CreatePublicShareDto) {
    if (dto.targetType === ShareTargetType.DATA_ROOM) {
      if (dto.folderId || dto.fileId)
        throw new BadRequestException(ApiMessages.shares.invalidRoomTarget);
      return;
    }
    if (dto.targetType === ShareTargetType.FOLDER) {
      if (!dto.folderId || dto.fileId)
        throw new BadRequestException(ApiMessages.shares.chooseFolderTarget);
      const folder = await this.prisma.folder.findFirst({
        where: { id: dto.folderId, dataRoomId: roomId },
        select: { id: true },
      });
      if (!folder) throw new NotFoundException(ApiMessages.resources.folderNotFound);
      return;
    }
    if (!dto.fileId || dto.folderId)
      throw new BadRequestException(ApiMessages.shares.chooseFileTarget);
    const file = await this.prisma.file.findFirst({
      where: { id: dto.fileId, dataRoomId: roomId },
      select: { id: true },
    });
    if (!file) throw new NotFoundException(ApiMessages.resources.fileNotFound);
  }

  private async activePublicShare(token: string) {
    const share = await this.prisma.share.findFirst({
      where: {
        token,
        accessType: ShareAccessType.PUBLIC_LINK,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        dataRoom: { select: { name: true, description: true } },
        folder: { select: { id: true, name: true, path: true } },
        file: {
          select: {
            id: true,
            name: true,
            storagePath: true,
            mimeType: true,
            sizeBytes: true,
            createdAt: true,
            updatedAt: true,
            folderId: true,
          },
        },
      },
    });
    if (!share) throw new NotFoundException(ApiMessages.shares.publicLinkUnavailable);
    return share;
  }

  private async activeUserShare(shareId: string, recipientId: string) {
    const share = await this.prisma.share.findFirst({
      where: {
        id: shareId,
        recipientId,
        accessType: ShareAccessType.USER,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        dataRoom: { select: { name: true, description: true } },
        folder: { select: { id: true, name: true, path: true } },
        file: {
          select: {
            id: true,
            name: true,
            storagePath: true,
            mimeType: true,
            sizeBytes: true,
            createdAt: true,
            updatedAt: true,
            folderId: true,
          },
        },
      },
    });
    if (!share) throw new NotFoundException(ApiMessages.shares.sharedAccessUnavailable);
    return share;
  }

  private async sharedFile(
    share: Awaited<ReturnType<DataRoomsService['activeUserShare']>>,
    fileId: string,
  ) {
    if (share.targetType === ShareTargetType.FILE && share.fileId !== fileId)
      throw new NotFoundException(ApiMessages.resources.fileNotFound);
    const where =
      share.targetType === ShareTargetType.FOLDER && share.folder
        ? {
            id: fileId,
            dataRoomId: share.dataRoomId,
            folder: { path: { startsWith: share.folder.path } },
          }
        : { id: fileId, dataRoomId: share.dataRoomId };
    const file = await this.prisma.file.findFirst({ where });
    if (!file) throw new NotFoundException(ApiMessages.resources.fileNotFound);
    return file;
  }

  private async breadcrumbs(
    roomId: string,
    folder: { id: string; name: string; parentId: string | null; path: string },
  ) {
    const ids = folder.path.split('/').filter(Boolean);
    return this.prisma.folder
      .findMany({
        where: { id: { in: ids }, dataRoomId: roomId },
        select: { id: true, name: true },
      })
      .then((rows) =>
        ids
          .map((id) => rows.find((row) => row.id === id))
          .filter((row): row is { id: string; name: string } => Boolean(row)),
      );
  }

  private storage() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key)
      throw new InternalServerErrorException(ApiMessages.uploads.storageNotConfigured);
    return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  }

  private async createStorageUrl(storagePath: string, download = false) {
    const { data, error } = await this.storage()
      .storage.from(this.storageBucket)
      .createSignedUrl(
        storagePath,
        DataRoomStorage.signedUrlTtlSeconds,
        download ? { download: true } : undefined,
      );
    if (error || !data) throw new NotFoundException(ApiMessages.uploads.storedFileUnavailable);
    return { url: data.signedUrl, expiresIn: DataRoomStorage.signedUrlTtlSeconds };
  }

  private async listDirectChildren(
    roomId: string,
    folderId: string | null,
    cursorInput: string | undefined,
    requestedLimit: number,
  ) {
    const cursor = this.decodeContentsCursor(cursorInput);
    const limit = clampPageSize(requestedLimit);
    const folderWhere = {
      dataRoomId: roomId,
      parentId: folderId,
      ...(cursor?.kind === 'folder'
        ? { OR: [{ name: { gt: cursor.name } }, { name: cursor.name, id: { gt: cursor.id } }] }
        : {}),
    };

    if (cursor?.kind !== 'file') {
      const folders = await this.prisma.folder.findMany({
        where: folderWhere,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: limit + 1,
      });
      const visibleFolders = folders.slice(0, limit);
      if (folders.length > limit) {
        return {
          items: visibleFolders.map((folder) => ({ ...folder, kind: 'folder' as const })),
          nextCursor: this.encodeContentsCursor({
            kind: 'folder',
            name: visibleFolders.at(-1)!.name,
            id: visibleFolders.at(-1)!.id,
          }),
        };
      }

      const remaining = limit - visibleFolders.length;
      const files = await this.prisma.file.findMany({
        where: { dataRoomId: roomId, folderId },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: remaining + 1,
      });
      const visibleFiles = files.slice(0, remaining);
      const items = [
        ...visibleFolders.map((folder) => ({ ...folder, kind: 'folder' as const })),
        ...visibleFiles.map(({ folderId: parentId, sizeBytes, ...file }) => ({
          ...file,
          parentId,
          kind: 'file' as const,
          sizeBytes: sizeBytes.toString(),
        })),
      ];
      const lastItem = items.at(-1);
      const nextCursor =
        files.length > remaining
          ? this.encodeContentsCursor({
              kind: lastItem?.kind ?? 'folder',
              name: lastItem?.name ?? '',
              id: lastItem?.id ?? '',
            })
          : null;
      return { items, nextCursor };
    }

    const files = await this.prisma.file.findMany({
      where: {
        dataRoomId: roomId,
        folderId,
        OR: [{ name: { gt: cursor.name } }, { name: cursor.name, id: { gt: cursor.id } }],
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });
    const visibleFiles = files.slice(0, limit);
    const items = visibleFiles.map(({ folderId: parentId, sizeBytes, ...file }) => ({
      ...file,
      parentId,
      kind: 'file' as const,
      sizeBytes: sizeBytes.toString(),
    }));
    const lastFile = visibleFiles.at(-1);
    return {
      items,
      nextCursor:
        files.length > limit && lastFile
          ? this.encodeContentsCursor({ kind: 'file', name: lastFile.name, id: lastFile.id })
          : null,
    };
  }

  private encodeContentsCursor(cursor: ContentsCursor) {
    return encodeCursor(cursor);
  }

  private decodeContentsCursor(cursor: string | undefined): ContentsCursor | null {
    const parsed = decodeContentsCursor(cursor);
    if (parsed === null) throw new BadRequestException(ApiMessages.validation.invalidPageCursor);
    return parsed ?? null;
  }

  private encodeFileSearchCursor(file: FileSearchCursor) {
    return encodeCursor(file);
  }

  private decodeFileSearchCursor(cursor: string | undefined): FileSearchCursor | null {
    const parsed = decodeFileSearchCursor(cursor);
    if (parsed === null) throw new BadRequestException(ApiMessages.validation.invalidSearchCursor);
    return parsed ?? null;
  }

  private async ensureBucket() {
    if (this.bucketReady) return;
    const client = this.storage();
    const { data, error } = await client.storage.listBuckets();
    if (error) throw new InternalServerErrorException(ApiMessages.uploads.storageUnavailable);
    if (!data.some((bucket) => bucket.id === this.storageBucket)) {
      const { error: createError } = await client.storage.createBucket(this.storageBucket, {
        public: false,
        fileSizeLimit: DataRoomStorage.upload.maxSizeBytes.toString(),
        allowedMimeTypes: [DataRoomStorage.upload.mimeType],
      });
      if (createError && !isAlreadyExistsError(createError.message))
        throw new InternalServerErrorException(ApiMessages.uploads.unableToCreateBucket);
    }
    this.bucketReady = true;
  }

  private async removeStorageObjects(paths: string[]) {
    const client = this.storage();
    for (let index = 0; index < paths.length; index += DataRoomStorage.maxObjectsPerDelete) {
      const { error } = await client.storage
        .from(this.storageBucket)
        .remove(paths.slice(index, index + DataRoomStorage.maxObjectsPerDelete));
      if (error) throw new InternalServerErrorException(ApiMessages.uploads.unableToRemoveFiles);
    }
  }

  private validateUploadCandidate(name: string, sizeBytes: number) {
    const cleaned = this.cleanFileName(name);
    if (!hasFileExtension(cleaned, DataRoomStorage.upload.extension))
      throw new BadRequestException(ApiMessages.uploads.onlyPdf);
    if (!isValidUploadSize(sizeBytes))
      throw new BadRequestException(ApiMessages.uploads.exceedsSizeLimit(cleaned));
    return cleaned;
  }

  private async discardUpload(upload: { id: string; storagePath: string }) {
    await this.prisma.uploadSession.delete({ where: { id: upload.id } }).catch(() => undefined);
    await this.removeStorageObjects([upload.storagePath]).catch(() => undefined);
  }

  private serializeFile(file: {
    id: string;
    name: string;
    folderId: string | null;
    mimeType: string;
    sizeBytes: bigint;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      ...file,
      parentId: file.folderId,
      kind: 'file' as const,
      sizeBytes: file.sizeBytes.toString(),
    };
  }

  private cleanFileName(name: string) {
    const cleaned = normalizeItemName(name);
    if (!cleaned || cleaned.length > ValidationLimits.fileNameLength)
      throw new BadRequestException(ApiMessages.validation.invalidFileName);
    return cleaned;
  }

  private cleanFolderName(name: string) {
    const cleaned = normalizeItemName(name);
    if (!cleaned || cleaned.length > ValidationLimits.folderNameLength)
      throw new BadRequestException(ApiMessages.validation.invalidFolderName);
    return cleaned;
  }

  private cleanRoomName(name: string) {
    const cleaned = normalizeRoomName(name);
    if (!cleaned || cleaned.length > ValidationLimits.roomNameLength)
      throw new BadRequestException(ApiMessages.validation.invalidRoomName);
    return cleaned;
  }

  private async nextAvailableName(
    roomId: string,
    folderId: string | null | undefined,
    original: string,
    excludedFileId?: string,
  ) {
    const extensionAt = original.lastIndexOf('.');
    const stem = extensionAt > 0 ? original.slice(0, extensionAt) : original;
    const extension = extensionAt > 0 ? original.slice(extensionAt) : '';
    for (let index = 0; index < 1000; index += 1) {
      const name = index ? `${stem} (${index})${extension}` : original;
      const match = await this.prisma.file.findFirst({
        where: {
          dataRoomId: roomId,
          folderId: folderId ?? null,
          name,
          ...(excludedFileId ? { id: { not: excludedFileId } } : {}),
        },
        select: { id: true },
      });
      if (!match) return name;
    }
    throw new ConflictException(ApiMessages.uploads.duplicateFileNames);
  }

  private async withAvailableFileName<T>(
    roomId: string,
    folderId: string | null | undefined,
    original: string,
    excludedFileId: string | undefined,
    action: (name: string) => Promise<T>,
  ) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const name = await this.nextAvailableName(roomId, folderId, original, excludedFileId);
      try {
        return await action(name);
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
      }
    }
    throw new ConflictException(ApiMessages.uploads.concurrentFileNameConflict);
  }

  private touchRoom(roomId: string) {
    return this.prisma.dataRoom.update({ where: { id: roomId }, data: { updatedAt: new Date() } });
  }
}
