import { Controller, Get, Param, Query } from '@nestjs/common';
import { DataRoomsService } from './data-rooms.service';
import { ContentsQueryDto } from './dto/contents-query.dto';
import { ApiRouteParameters, ApiRoutes } from '../routes/api-routes';

@Controller(ApiRoutes.PublicShares.controller)
export class PublicSharesController {
  constructor(private readonly dataRooms: DataRoomsService) {}

  // List content exposed by a public token.
  @Get(ApiRoutes.PublicShares.contents)
  contents(@Param(ApiRouteParameters.token) token: string, @Query() dto: ContentsQueryDto) {
    return this.dataRooms.publicContents(token, dto);
  }

  // Create a preview URL for a public file.
  @Get(ApiRoutes.PublicShares.viewFile)
  viewFile(
    @Param(ApiRouteParameters.token) token: string,
    @Param(ApiRouteParameters.fileId) fileId: string,
  ) {
    return this.dataRooms.createPublicViewUrl(token, fileId);
  }

  // Create a download URL for a public file.
  @Get(ApiRoutes.PublicShares.downloadFile)
  downloadFile(
    @Param(ApiRouteParameters.token) token: string,
    @Param(ApiRouteParameters.fileId) fileId: string,
  ) {
    return this.dataRooms.createPublicDownloadUrl(token, fileId);
  }
}
