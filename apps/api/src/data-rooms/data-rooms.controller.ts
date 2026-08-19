import { Body, Controller, Get, Param, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CreateDataRoomDto } from './dto/create-data-room.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UploadFilesDto } from './dto/upload-files.dto';
import { DataRoomsService } from './data-rooms.service';

@Controller('data-rooms')
@UseGuards(SupabaseAuthGuard)
export class DataRoomsController {
  constructor(private readonly dataRooms: DataRoomsService) {}

  @Get() list(@CurrentUser() user: AuthenticatedUser) { return this.dataRooms.list(user.id); }

  @Post() create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDataRoomDto) { return this.dataRooms.create(user.id, user.email, dto); }

  @Get(':roomId/contents')
  contents(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Query('folderId') folderId?: string) { return this.dataRooms.contents(roomId, user.id, folderId); }

  @Post(':roomId/folders')
  createFolder(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Body() dto: CreateFolderDto) { return this.dataRooms.createFolder(roomId, user.id, dto); }

  @Post(':roomId/files')
  @UseInterceptors(FilesInterceptor('files', 10, { limits: { fileSize: 25 * 1024 * 1024 } }))
  uploadFiles(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Body() dto: UploadFilesDto, @UploadedFiles() files: UploadFile[] = []) {
    return this.dataRooms.uploadFiles(roomId, user.id, dto.folderId, files);
  }

  @Get(':roomId/files/:fileId/view')
  viewFile(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Param('fileId') fileId: string) {
    return this.dataRooms.createViewUrl(roomId, user.id, fileId);
  }
}

interface UploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
