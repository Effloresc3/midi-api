import { Injectable } from '@nestjs/common';

import { MidiProcessor } from './utils';
import { TokenProcessor } from './utils2';

@Injectable()
export class AppService {
  constructor(
    private readonly midiProcessor: MidiProcessor,
    private readonly tokenProcessor: TokenProcessor,
  ) {}
  generateMidi(midiPath: string, timebase: number): void {
    console.log(midiPath);
    const tokens = this.midiProcessor.convertMidiToTokens(midiPath, timebase);
    return this.tokenProcessor.processTokens(tokens);
  }

  // completeMidi(): string {
  //   return 'Hello World!';
  // }
}
