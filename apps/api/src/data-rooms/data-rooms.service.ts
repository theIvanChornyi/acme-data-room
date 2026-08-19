import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDataRoomDto } from './dto/create-data-room.dto';
import { CreateFolderDto } from './dto/create-folder.dto';

@Injectable()
export class DataRoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerId: string) {
    return this.prisma.dataRoom.findMany({ where: { ownerId }, orderBy: { updatedAt: 'desc' } });
  }

  async create(ownerId: string, email: string, dto: CreateDataRoomDto) {
    await this.prisma.user.upsert({ where: { id: ownerId }, update: { email }, create: { id: ownerId, email } });
    return this.prisma.dataRoom.create({ data: { ...dto, ownerId } });
  }

  async contents(roomId: string, ownerId: string, folderId?: string) {
    await this.assertOwner(roomId, ownerId);
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
      return await this.prisma.folder.create({ data: { id, name: dto.name.trim(), dataRoomId: roomId, parentId: parent?.id, depth: (parent?.depth ?? -1) + 1, path } });
    } catch (error: unknown) {
      if (this.isUniqueError(error)) throw new ConflictException('A folder with this name already exists here');
      throw error;
    }
  }

  private async assertOwner(roomId: string, ownerId: string) {
    const room = await this.prisma.dataRoom.findFirst({ where: { id: roomId, ownerId } });
    if (!room) throw new ForbiddenException('You do not have access to this Data Room');
    return room;
  }

  private async breadcrumbs(roomId: string, folder: { id: string; name: string; parentId: string | null; path: string }) {
    const ids = folder.path.split('/').filter(Boolean);
    return this.prisma.folder.findMany({ where: { id: { in: ids }, dataRoomId: roomId }, select: { id: true, name: true } }).then((rows) => ids.map((id) => rows.find((row) => row.id === id)).filter((row): row is { id: string; name: string } => Boolean(row)));
  }

  private isUniqueError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002';
  }
}
