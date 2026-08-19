import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDataRoomDto } from './dto/create-data-room.dto';
import { CreateFolderDto } from './dto/create-folder.dto';

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
    const { data, error } = await this.storage().storage.from(this.storageBucket).createSignedUrl(file.storagePath, 10 * 60);
    if (error || !data) throw new NotFoundException('The stored file is no longer available');
    return { url: data.signedUrl, expiresIn: 600 };
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

  private storage() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new InternalServerErrorException('Supabase storage is not configured');
    return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
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

  private async nextAvailableName(roomId: string, folderId: string | undefined, original: string) {
    const extensionAt = original.lastIndexOf('.');
    const stem = extensionAt > 0 ? original.slice(0, extensionAt) : original;
    const extension = extensionAt > 0 ? original.slice(extensionAt) : '';
    for (let index = 0; index < 1000; index += 1) {
      const name = index ? `${stem} (${index})${extension}` : original;
      const match = await this.prisma.file.findFirst({ where: { dataRoomId: roomId, folderId: folderId ?? null, name }, select: { id: true } });
      if (!match) return name;
    }
    throw new ConflictException('Too many files with the same name in this folder');
  }

  private isUniqueError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002';
  }
}

interface UploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
