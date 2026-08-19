import { Module } from '@nestjs/common';
import { DataRoomsController } from './data-rooms.controller';
import { DataRoomsService } from './data-rooms.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Module({ controllers: [DataRoomsController], providers: [DataRoomsService, SupabaseAuthGuard] })
export class DataRoomsModule {}
