import { Controller, ForbiddenException, Headers, Post } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { DataRoomsService } from './data-rooms.service';
import { ApiRequestHeaders, ApiRoutes } from '../routes/api-routes';
import { ApiMessages } from '../common/messages';

@Controller(ApiRoutes.Maintenance.controller)
export class MaintenanceController {
  constructor(private readonly dataRooms: DataRoomsService) {}

  // Remove expired uploads and advance queued large deletions.
  @Post(ApiRoutes.Maintenance.expiredUploads)
  async cleanupExpiredUploads(@Headers(ApiRequestHeaders.maintenanceSecret) suppliedSecret?: string) {
    if (!this.isAuthorized(suppliedSecret))
      throw new ForbiddenException(ApiMessages.authorization.maintenanceAccessDenied);
    const uploads = await this.dataRooms.cleanupExpiredUploads();
    const deletions = await this.dataRooms.processPendingDeletionJobs();
    return { uploads, deletions };
  }

  private isAuthorized(suppliedSecret: string | undefined) {
    const expectedSecret = process.env.UPLOAD_CLEANUP_SECRET;
    if (!expectedSecret || !suppliedSecret) return false;
    const expected = Buffer.from(expectedSecret);
    const supplied = Buffer.from(suppliedSecret);
    return expected.length === supplied.length && timingSafeEqual(expected, supplied);
  }
}
