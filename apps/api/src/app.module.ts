import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DataRoomsModule } from './data-rooms/data-rooms.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, DataRoomsModule],
})
export class AppModule {}
