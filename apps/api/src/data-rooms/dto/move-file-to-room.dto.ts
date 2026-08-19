import { IsUUID } from 'class-validator';

export class MoveFileToRoomDto {
  @IsUUID()
  destinationRoomId!: string;
}
