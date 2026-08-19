import { Controller, Get, Param, Query } from '@nestjs/common';
import { DataRoomsService } from './data-rooms.service';
import { ContentsQueryDto } from './dto/contents-query.dto';
import { ApiRouteParameters, ApiRoutes } from '../routes/api-routes';

@Controller(ApiRoutes.PublicShares.controller)
export class PublicSharesController {
  constructor(private readonly dataRooms: DataRoomsService) {}

  @Get(ApiRoutes.PublicShares.contents)
  contents(@Param(ApiRouteParameters.token) token: string, @Query() dto: ContentsQueryDto) {
    return this.dataRooms.publicContents(token, dto);
  }

  @Get(ApiRoutes.PublicShares.viewFile)
  viewFile(
    @Param(ApiRouteParameters.token) token: string,
    @Param(ApiRouteParameters.fileId) fileId: string,
  ) {
    return this.dataRooms.createPublicViewUrl(token, fileId);
  }

  @Get(ApiRoutes.PublicShares.downloadFile)
  downloadFile(
    @Param(ApiRouteParameters.token) token: string,
    @Param(ApiRouteParameters.fileId) fileId: string,
  ) {
    return this.dataRooms.createPublicDownloadUrl(token, fileId);
  }
}
