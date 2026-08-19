import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CreateDataRoomDto } from './dto/create-data-room.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UploadFilesDto } from './dto/upload-files.dto';
import { MoveFileDto } from './dto/move-file.dto';
import { RenameItemDto } from './dto/rename-item.dto';
import { MoveFileToRoomDto } from './dto/move-file-to-room.dto';
import { CreatePublicShareDto } from './dto/create-public-share.dto';
import { GrantUserShareDto } from './dto/grant-user-share.dto';
import { ContentsQueryDto } from './dto/contents-query.dto';
import { ListFoldersDto } from './dto/list-folders.dto';
import { DataRoomsService } from './data-rooms.service';

@Controller('data-rooms')
@UseGuards(SupabaseAuthGuard)
export class DataRoomsController {
  constructor(private readonly dataRooms: DataRoomsService) {}

  @Get() list(@CurrentUser() user: AuthenticatedUser) { return this.dataRooms.list(user.id); }

  @Post() create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDataRoomDto) { return this.dataRooms.create(user.id, user.email, dto); }

  @Patch(':roomId')
  renameRoom(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Body() dto: CreateDataRoomDto) { return this.dataRooms.renameRoom(roomId, user.id, dto); }

  @Delete(':roomId')
  deleteRoom(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string) { return this.dataRooms.deleteRoom(roomId, user.id); }

  @Get(':roomId/contents')
  contents(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Query() dto: ContentsQueryDto) { return this.dataRooms.contents(roomId, user.id, dto); }

  @Get(':roomId/shares/public')
  listPublicShares(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Query() dto: CreatePublicShareDto) { return this.dataRooms.listPublicShares(roomId, user.id, dto); }

  @Post(':roomId/shares/public')
  createPublicShare(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Body() dto: CreatePublicShareDto) { return this.dataRooms.createPublicShare(roomId, user.id, dto); }

  @Delete(':roomId/shares/public/:shareId')
  revokePublicShare(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Param('shareId') shareId: string) { return this.dataRooms.revokePublicShare(roomId, user.id, shareId); }

  @Get(':roomId/shares/users')
  listUserShares(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Query() dto: CreatePublicShareDto) { return this.dataRooms.listUserShares(roomId, user.id, dto); }

  @Post(':roomId/shares/users')
  grantUserShare(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Body() dto: GrantUserShareDto) { return this.dataRooms.grantUserShare(roomId, user.id, dto); }

  @Delete(':roomId/shares/users/:shareId')
  revokeUserShare(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Param('shareId') shareId: string) { return this.dataRooms.revokeUserShare(roomId, user.id, shareId); }

  @Get('shared-with-me')
  sharedWithMe(@CurrentUser() user: AuthenticatedUser) { return this.dataRooms.sharedWithMe(user.id); }

  @Get('shared-with-me/:shareId/contents')
  sharedWithMeContents(@CurrentUser() user: AuthenticatedUser, @Param('shareId') shareId: string, @Query() dto: ContentsQueryDto) { return this.dataRooms.userShareContents(shareId, user.id, dto); }

  @Get('shared-with-me/:shareId/files/:fileId/view')
  sharedWithMeView(@CurrentUser() user: AuthenticatedUser, @Param('shareId') shareId: string, @Param('fileId') fileId: string) { return this.dataRooms.createUserShareViewUrl(shareId, user.id, fileId); }

  @Get('shared-with-me/:shareId/files/:fileId/download')
  sharedWithMeDownload(@CurrentUser() user: AuthenticatedUser, @Param('shareId') shareId: string, @Param('fileId') fileId: string) { return this.dataRooms.createUserShareDownloadUrl(shareId, user.id, fileId); }

  @Post(':roomId/folders')
  createFolder(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Body() dto: CreateFolderDto) { return this.dataRooms.createFolder(roomId, user.id, dto); }

  @Get(':roomId/folders')
  listFolders(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Query() dto: ListFoldersDto) { return this.dataRooms.listFolders(roomId, user.id, dto.parentId); }

  @Get(':roomId/folder-options')
  listFolderOptions(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string) { return this.dataRooms.listFolderOptions(roomId, user.id); }

  @Patch(':roomId/folders/:folderId')
  renameFolder(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Param('folderId') folderId: string, @Body() dto: RenameItemDto) { return this.dataRooms.renameFolder(roomId, user.id, folderId, dto.name); }

  @Get(':roomId/folders/:folderId/deletion-summary')
  folderDeletionSummary(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Param('folderId') folderId: string) { return this.dataRooms.folderDeletionSummary(roomId, user.id, folderId); }

  @Delete(':roomId/folders/:folderId')
  deleteFolder(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Param('folderId') folderId: string) { return this.dataRooms.deleteFolder(roomId, user.id, folderId); }

  @Post(':roomId/files')
  @UseInterceptors(FilesInterceptor('files', 10, { limits: { fileSize: 25 * 1024 * 1024 } }))
  uploadFiles(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Body() dto: UploadFilesDto, @UploadedFiles() files: UploadFile[] = []) {
    return this.dataRooms.uploadFiles(roomId, user.id, dto.folderId, files);
  }

  @Get(':roomId/files/:fileId/view')
  viewFile(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Param('fileId') fileId: string) {
    return this.dataRooms.createViewUrl(roomId, user.id, fileId);
  }

  @Get(':roomId/files/:fileId/download')
  downloadFile(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Param('fileId') fileId: string) {
    return this.dataRooms.createDownloadUrl(roomId, user.id, fileId);
  }

  @Patch(':roomId/files/:fileId')
  renameFile(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Param('fileId') fileId: string, @Body() dto: RenameItemDto) { return this.dataRooms.renameFile(roomId, user.id, fileId, dto.name); }

  @Patch(':roomId/files/:fileId/move')
  moveFile(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Param('fileId') fileId: string, @Body() dto: MoveFileDto) { return this.dataRooms.moveFile(roomId, user.id, fileId, dto.folderId); }

  @Patch(':roomId/files/:fileId/move-to-room')
  moveFileToRoom(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Param('fileId') fileId: string, @Body() dto: MoveFileToRoomDto) { return this.dataRooms.moveFileToRoom(roomId, user.id, fileId, dto.destinationRoomId); }

  @Delete(':roomId/files/:fileId')
  deleteFile(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Param('fileId') fileId: string) { return this.dataRooms.deleteFile(roomId, user.id, fileId); }
}

interface UploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
