import { Controller, ForbiddenException, Headers, Post } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { DataRoomsService } from './data-rooms.service';

@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly dataRooms: DataRoomsService) {}

  @Post('expired-uploads')
  cleanupExpiredUploads(@Headers('x-maintenance-secret') suppliedSecret?: string) {
    if (!this.isAuthorized(suppliedSecret)) throw new ForbiddenException('Not authorized');
    return this.dataRooms.cleanupExpiredUploads();
  }

  private isAuthorized(suppliedSecret: string | undefined) {
    const expectedSecret = process.env.UPLOAD_CLEANUP_SECRET;
    if (!expectedSecret || !suppliedSecret) return false;
    const expected = Buffer.from(expectedSecret);
    const supplied = Buffer.from(suppliedSecret);
    return expected.length === supplied.length && timingSafeEqual(expected, supplied);
  }
}
