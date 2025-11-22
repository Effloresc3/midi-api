import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MidiProcessor } from './utils';
import { TokenProcessor } from './utils2';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, MidiProcessor, TokenProcessor],
})
export class AppModule {}
