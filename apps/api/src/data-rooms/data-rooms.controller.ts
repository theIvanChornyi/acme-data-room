import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CreateDataRoomDto } from './dto/create-data-room.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
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
}
