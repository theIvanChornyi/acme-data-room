import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
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
import { BulkSelectionDto } from './dto/bulk-selection.dto';
import { DataRoomsService } from './data-rooms.service';
import { ApiRouteParameters, ApiRoutes } from '../routes/api-routes';

@Controller(ApiRoutes.DataRooms.controller)
@UseGuards(SupabaseAuthGuard)
export class DataRoomsController {
  constructor(private readonly dataRooms: DataRoomsService) {}

  // List the caller's Data Rooms.
  @Get() list(@CurrentUser() user: AuthenticatedUser) {
    return this.dataRooms.list(user.id);
  }

  // Create a Data Room for the caller.
  @Post() create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDataRoomDto) {
    return this.dataRooms.create(user.id, user.email, dto);
  }

  // Rename a Data Room.
  @Patch(ApiRoutes.DataRooms.room)
  renameRoom(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Body() dto: CreateDataRoomDto,
  ) {
    return this.dataRooms.renameRoom(roomId, user.id, dto);
  }

  // Delete a Data Room and its content.
  @Delete(ApiRoutes.DataRooms.room)
  deleteRoom(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
  ) {
    return this.dataRooms.deleteRoom(roomId, user.id);
  }

  // Process one bounded batch for a deletion requested by the owner.
  @Post(ApiRoutes.DataRooms.processDeletionJob)
  processDeletionJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Param(ApiRouteParameters.deletionJobId) deletionJobId: string,
  ) {
    return this.dataRooms.processDeletionJobForOwner(roomId, user.id, deletionJobId);
  }

  // List room content with pagination.
  @Get(ApiRoutes.DataRooms.contents)
  contents(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Query() dto: ContentsQueryDto,
  ) {
    return this.dataRooms.contents(roomId, user.id, dto);
  }

  // Search files in a Data Room.
  @Get(ApiRoutes.DataRooms.search)
  searchFiles(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Query() dto: SearchFilesDto,
  ) {
    return this.dataRooms.searchFiles(roomId, user.id, dto);
  }

  // List public links for a target.
  @Get(ApiRoutes.DataRooms.publicShares)
  listPublicShares(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Query() dto: CreatePublicShareDto,
  ) {
    return this.dataRooms.listPublicShares(roomId, user.id, dto);
  }

  // Create a public link for a target.
  @Post(ApiRoutes.DataRooms.publicShares)
  createPublicShare(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Body() dto: CreatePublicShareDto,
  ) {
    return this.dataRooms.createPublicShare(roomId, user.id, dto);
  }

  // Revoke a public link.
  @Delete(ApiRoutes.DataRooms.publicShare)
  revokePublicShare(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Param(ApiRouteParameters.shareId) shareId: string,
  ) {
    return this.dataRooms.revokePublicShare(roomId, user.id, shareId);
  }

  // List user access grants for a target.
  @Get(ApiRoutes.DataRooms.userShares)
  listUserShares(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Query() dto: CreatePublicShareDto,
  ) {
    return this.dataRooms.listUserShares(roomId, user.id, dto);
  }

  // Grant a user access to a target.
  @Post(ApiRoutes.DataRooms.userShares)
  grantUserShare(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Body() dto: GrantUserShareDto,
  ) {
    return this.dataRooms.grantUserShare(roomId, user.id, dto);
  }

  // Revoke a user's access grant.
  @Delete(ApiRoutes.DataRooms.userShare)
  revokeUserShare(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Param(ApiRouteParameters.shareId) shareId: string,
  ) {
    return this.dataRooms.revokeUserShare(roomId, user.id, shareId);
  }

  // List content shared with the caller.
  @Get(ApiRoutes.DataRooms.sharedWithMe)
  sharedWithMe(@CurrentUser() user: AuthenticatedUser) {
    return this.dataRooms.sharedWithMe(user.id);
  }

  // List content in a received share.
  @Get(ApiRoutes.DataRooms.receivedShareContents)
  sharedWithMeContents(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.shareId) shareId: string,
    @Query() dto: ContentsQueryDto,
  ) {
    return this.dataRooms.userShareContents(shareId, user.id, dto);
  }

  // Create a preview URL for a received file.
  @Get(ApiRoutes.DataRooms.receivedShareViewFile)
  sharedWithMeView(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.shareId) shareId: string,
    @Param(ApiRouteParameters.fileId) fileId: string,
  ) {
    return this.dataRooms.createUserShareViewUrl(shareId, user.id, fileId);
  }

  // Create a download URL for a received file.
  @Get(ApiRoutes.DataRooms.receivedShareDownloadFile)
  sharedWithMeDownload(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.shareId) shareId: string,
    @Param(ApiRouteParameters.fileId) fileId: string,
  ) {
    return this.dataRooms.createUserShareDownloadUrl(shareId, user.id, fileId);
  }

  // Create a folder in a Data Room.
  @Post(ApiRoutes.DataRooms.folders)
  createFolder(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Body() dto: CreateFolderDto,
  ) {
    return this.dataRooms.createFolder(roomId, user.id, dto);
  }

  // List direct child folders.
  @Get(ApiRoutes.DataRooms.folders)
  listFolders(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Query() dto: ListFoldersDto,
  ) {
    return this.dataRooms.listFolders(roomId, user.id, dto.parentId);
  }

  // List folders for move destinations.
  @Get(ApiRoutes.DataRooms.folderOptions)
  listFolderOptions(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
  ) {
    return this.dataRooms.listFolderOptions(roomId, user.id);
  }

  // Rename a folder.
  @Patch(ApiRoutes.DataRooms.folder)
  renameFolder(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Param(ApiRouteParameters.folderId) folderId: string,
    @Body() dto: RenameItemDto,
  ) {
    return this.dataRooms.renameFolder(roomId, user.id, folderId, dto.name);
  }

  // Preview the impact of deleting a folder.
  @Get(ApiRoutes.DataRooms.folderDeletionSummary)
  folderDeletionSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Param(ApiRouteParameters.folderId) folderId: string,
  ) {
    return this.dataRooms.folderDeletionSummary(roomId, user.id, folderId);
  }

  // Preview all descendants and access grants affected by a bulk removal.
  @Post(ApiRoutes.DataRooms.bulkDeletionSummary)
  bulkDeletionSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Body() dto: BulkSelectionDto,
  ) {
    return this.dataRooms.bulkDeletionSummary(roomId, user.id, dto);
  }

  // Queue folder subtrees for durable deletion and remove selected standalone files in bounded batches.
  @Post(ApiRoutes.DataRooms.bulkDelete)
  bulkDelete(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Body() dto: BulkSelectionDto,
  ) {
    return this.dataRooms.bulkDelete(roomId, user.id, dto);
  }

  // Delete a folder subtree.
  @Delete(ApiRoutes.DataRooms.folder)
  deleteFolder(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Param(ApiRouteParameters.folderId) folderId: string,
  ) {
    return this.dataRooms.deleteFolder(roomId, user.id, folderId);
  }

  // Start a direct file upload.
  @Post(ApiRoutes.DataRooms.uploadUrl)
  createUploadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Body() dto: CreateUploadUrlDto,
  ) {
    return this.dataRooms.createUploadUrl(roomId, user.id, dto);
  }

  // Confirm a completed upload.
  @Post(ApiRoutes.DataRooms.completeUpload)
  completeUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Body() dto: CompleteUploadDto,
  ) {
    return this.dataRooms.completeUpload(roomId, user.id, dto.uploadId);
  }

  // Cancel a pending upload.
  @Delete(ApiRoutes.DataRooms.upload)
  cancelUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Param(ApiRouteParameters.uploadId) uploadId: string,
  ) {
    return this.dataRooms.cancelUpload(roomId, user.id, uploadId);
  }

  // Create a private preview URL.
  @Get(ApiRoutes.DataRooms.viewFile)
  viewFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Param(ApiRouteParameters.fileId) fileId: string,
  ) {
    return this.dataRooms.createViewUrl(roomId, user.id, fileId);
  }

  // Create a private download URL.
  @Get(ApiRoutes.DataRooms.downloadFile)
  downloadFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Param(ApiRouteParameters.fileId) fileId: string,
  ) {
    return this.dataRooms.createDownloadUrl(roomId, user.id, fileId);
  }

  // Stream a ZIP archive directly to the caller. Files never pass through browser memory first.
  @Post(ApiRoutes.DataRooms.downloadArchive)
  async downloadArchive(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Body() dto: BulkSelectionDto,
    @Res() response: Response,
  ) {
    const download = await this.dataRooms.createArchiveDownload(roomId, user.id, dto);
    response.status(200);
    response.setHeader('Content-Type', 'application/zip');
    response.setHeader('Content-Disposition', `attachment; filename="${download.fileName}"`);
    response.setHeader('Cache-Control', 'no-store');
    download.archive.on('error', (error) => response.destroy(error));
    download.archive.pipe(response);
    void download.start();
  }

  // Rename a file.
  @Patch(ApiRoutes.DataRooms.file)
  renameFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Param(ApiRouteParameters.fileId) fileId: string,
    @Body() dto: RenameItemDto,
  ) {
    return this.dataRooms.renameFile(roomId, user.id, fileId, dto.name);
  }

  // Move a file within its Data Room.
  @Patch(ApiRoutes.DataRooms.moveFile)
  moveFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Param(ApiRouteParameters.fileId) fileId: string,
    @Body() dto: MoveFileDto,
  ) {
    return this.dataRooms.moveFile(roomId, user.id, fileId, dto.folderId);
  }

  // Move a file to another Data Room.
  @Patch(ApiRoutes.DataRooms.moveFileToRoom)
  moveFileToRoom(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Param(ApiRouteParameters.fileId) fileId: string,
    @Body() dto: MoveFileToRoomDto,
  ) {
    return this.dataRooms.moveFileToRoom(roomId, user.id, fileId, dto.destinationRoomId);
  }

  // Delete a file.
  @Delete(ApiRoutes.DataRooms.file)
  deleteFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param(ApiRouteParameters.roomId) roomId: string,
    @Param(ApiRouteParameters.fileId) fileId: string,
  ) {
    return this.dataRooms.deleteFile(roomId, user.id, fileId);
  }
}
