import { Controller, Get, Param, Query } from '@nestjs/common';
import { DataRoomsService } from './data-rooms.service';
import { ContentsQueryDto } from './dto/contents-query.dto';

@Controller('public/shares')
export class PublicSharesController {
  constructor(private readonly dataRooms: DataRoomsService) {}

  @Get(':token/contents')
  contents(@Param('token') token: string, @Query() dto: ContentsQueryDto) { return this.dataRooms.publicContents(token, dto); }

  @Get(':token/files/:fileId/view')
  viewFile(@Param('token') token: string, @Param('fileId') fileId: string) { return this.dataRooms.createPublicViewUrl(token, fileId); }

  @Get(':token/files/:fileId/download')
  downloadFile(@Param('token') token: string, @Param('fileId') fileId: string) { return this.dataRooms.createPublicDownloadUrl(token, fileId); }
}
