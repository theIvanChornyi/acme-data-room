import { Module } from '@nestjs/common';
import { DataRoomsController } from './data-rooms.controller';
import { MaintenanceController } from './maintenance.controller';
import { PublicSharesController } from './public-shares.controller';
import { DataRoomsService } from './data-rooms.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Module({
  controllers: [DataRoomsController, PublicSharesController, MaintenanceController],
  providers: [DataRoomsService, SupabaseAuthGuard],
})
export class DataRoomsModule {}
