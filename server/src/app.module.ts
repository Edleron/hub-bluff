import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { RoomModule } from './room/room.module';
import { GameModule } from './game/game.module';

@Module({
  imports: [AuthModule, RoomModule, GameModule],
})
export class AppModule {}
