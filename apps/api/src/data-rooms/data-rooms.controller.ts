import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CreateDataRoomDto } from './dto/create-data-room.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { MoveFileDto } from './dto/move-file.dto';
import { RenameItemDto } from './dto/rename-item.dto';
import { MoveFileToRoomDto } from './dto/move-file-to-room.dto';
import { CreatePublicShareDto } from './dto/create-public-share.dto';
import { GrantUserShareDto } from './dto/grant-user-share.dto';
import { ContentsQueryDto } from './dto/contents-query.dto';
import { ListFoldersDto } from './dto/list-folders.dto';
import { SearchFilesDto } from './dto/search-files.dto';
import { DataRoomsService } from './data-rooms.service';
import { ApiRouteParameters, ApiRoutes } from '../routes/api-routes';

@Controller(ApiRoutes.DataRooms.controller)
@UseGuards(SupabaseAuthGuard)
export class DataRoomsController {
  constructor(private readonly dataRooms: DataRoomsService) {}

  @Get() list(@CurrentUser() user: AuthenticatedUser) {
    return this.dataRooms.list(user.id);
  }

  @Post() create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDataRoomDto) {
    return this.dataRooms.create(user.id, user.email, dto);
  }

  @Patch(ApiRoutes.DataRooms.room)
  renameRoom(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Body() dto: CreateDataRoomDto,
  ) {
    return this.dataRooms.renameRoom(roomId, user.id, dto);
  }

  @Delete(ApiRoutes.DataRooms.room)
  deleteRoom(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
  ) {
    return this.dataRooms.deleteRoom(roomId, user.id);
  }

  @Get(ApiRoutes.DataRooms.contents)
  contents(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Query() dto: ContentsQueryDto,
  ) {
    return this.dataRooms.contents(roomId, user.id, dto);
  }

  @Get(ApiRoutes.DataRooms.search)
  searchFiles(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Query() dto: SearchFilesDto,
  ) {
    return this.dataRooms.searchFiles(roomId, user.id, dto);
  }

  @Get(ApiRoutes.DataRooms.publicShares)
  listPublicShares(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Query() dto: CreatePublicShareDto,
  ) {
    return this.dataRooms.listPublicShares(roomId, user.id, dto);
  }

  @Post(ApiRoutes.DataRooms.publicShares)
  createPublicShare(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Body() dto: CreatePublicShareDto,
  ) {
    return this.dataRooms.createPublicShare(roomId, user.id, dto);
  }

  @Delete(ApiRoutes.DataRooms.publicShare)
  revokePublicShare(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Param(ApiRouteParameters.shareId) shareId: string,
  ) {
    return this.dataRooms.revokePublicShare(roomId, user.id, shareId);
  }

  @Get(ApiRoutes.DataRooms.userShares)
  listUserShares(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Query() dto: CreatePublicShareDto,
  ) {
    return this.dataRooms.listUserShares(roomId, user.id, dto);
  }

  @Post(ApiRoutes.DataRooms.userShares)
  grantUserShare(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Body() dto: GrantUserShareDto,
  ) {
    return this.dataRooms.grantUserShare(roomId, user.id, dto);
  }

  @Delete(ApiRoutes.DataRooms.userShare)
  revokeUserShare(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Param(ApiRouteParameters.shareId) shareId: string,
  ) {
    return this.dataRooms.revokeUserShare(roomId, user.id, shareId);
  }

  @Get(ApiRoutes.DataRooms.sharedWithMe)
  sharedWithMe(@CurrentUser() user: AuthenticatedUser) {
    return this.dataRooms.sharedWithMe(user.id);
  }

  @Get(ApiRoutes.DataRooms.receivedShareContents)
  sharedWithMeContents(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.shareId) shareId: string,
    @Query() dto: ContentsQueryDto,
  ) {
    return this.dataRooms.userShareContents(shareId, user.id, dto);
  }

  @Get(ApiRoutes.DataRooms.receivedShareViewFile)
  sharedWithMeView(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.shareId) shareId: string,
    @Param(ApiRouteParameters.fileId) fileId: string,
  ) {
    return this.dataRooms.createUserShareViewUrl(shareId, user.id, fileId);
  }

  @Get(ApiRoutes.DataRooms.receivedShareDownloadFile)
  sharedWithMeDownload(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.shareId) shareId: string,
    @Param(ApiRouteParameters.fileId) fileId: string,
  ) {
    return this.dataRooms.createUserShareDownloadUrl(shareId, user.id, fileId);
  }

  @Post(ApiRoutes.DataRooms.folders)
  createFolder(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Body() dto: CreateFolderDto,
  ) {
    return this.dataRooms.createFolder(roomId, user.id, dto);
  }

  @Get(ApiRoutes.DataRooms.folders)
  listFolders(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Query() dto: ListFoldersDto,
  ) {
    return this.dataRooms.listFolders(roomId, user.id, dto.parentId);
  }

  @Get(ApiRoutes.DataRooms.folderOptions)
  listFolderOptions(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
  ) {
    return this.dataRooms.listFolderOptions(roomId, user.id);
  }

  @Patch(ApiRoutes.DataRooms.folder)
  renameFolder(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Param(ApiRouteParameters.folderId) folderId: string,
    @Body() dto: RenameItemDto,
  ) {
    return this.dataRooms.renameFolder(roomId, user.id, folderId, dto.name);
  }

  @Get(ApiRoutes.DataRooms.folderDeletionSummary)
  folderDeletionSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Param(ApiRouteParameters.folderId) folderId: string,
  ) {
    return this.dataRooms.folderDeletionSummary(roomId, user.id, folderId);
  }

  @Delete(ApiRoutes.DataRooms.folder)
  deleteFolder(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Param(ApiRouteParameters.folderId) folderId: string,
  ) {
    return this.dataRooms.deleteFolder(roomId, user.id, folderId);
  }

  @Post(ApiRoutes.DataRooms.uploadUrl)
  createUploadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Body() dto: CreateUploadUrlDto,
  ) {
    return this.dataRooms.createUploadUrl(roomId, user.id, dto);
  }

  @Post(ApiRoutes.DataRooms.completeUpload)
  completeUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Body() dto: CompleteUploadDto,
  ) {
    return this.dataRooms.completeUpload(roomId, user.id, dto.uploadId);
  }

  @Delete(ApiRoutes.DataRooms.upload)
  cancelUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Param(ApiRouteParameters.uploadId) uploadId: string,
  ) {
    return this.dataRooms.cancelUpload(roomId, user.id, uploadId);
  }

  @Get(ApiRoutes.DataRooms.viewFile)
  viewFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Param(ApiRouteParameters.fileId) fileId: string,
  ) {
    return this.dataRooms.createViewUrl(roomId, user.id, fileId);
  }

  @Get(ApiRoutes.DataRooms.downloadFile)
  downloadFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Param(ApiRouteParameters.fileId) fileId: string,
  ) {
    return this.dataRooms.createDownloadUrl(roomId, user.id, fileId);
  }

  @Patch(ApiRoutes.DataRooms.file)
  renameFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Param(ApiRouteParameters.fileId) fileId: string,
    @Body() dto: RenameItemDto,
  ) {
    return this.dataRooms.renameFile(roomId, user.id, fileId, dto.name);
  }

  @Patch(ApiRoutes.DataRooms.moveFile)
  moveFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Param(ApiRouteParameters.fileId) fileId: string,
    @Body() dto: MoveFileDto,
  ) {
    return this.dataRooms.moveFile(roomId, user.id, fileId, dto.folderId);
  }

  @Patch(ApiRoutes.DataRooms.moveFileToRoom)
  moveFileToRoom(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Param(ApiRouteParameters.fileId) fileId: string,
    @Body() dto: MoveFileToRoomDto,
  ) {
    return this.dataRooms.moveFileToRoom(roomId, user.id, fileId, dto.destinationRoomId);
  }

  @Delete(ApiRoutes.DataRooms.file)
  deleteFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Param(ApiRouteParameters.fileId) fileId: string,
  ) {
    return this.dataRooms.deleteFile(roomId, user.id, fileId);
  }
}
