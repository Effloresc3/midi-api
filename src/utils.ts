import fs from 'fs';
import path from 'path';
import { Injectable } from '@nestjs/common';
import { Midi } from '@tonejs/midi';

// Convert MIDI note number → name (C4, D#3…)
function midiToPitchName(n: number): string {
  const names = [
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
    'A',
    'A#',
    'B',
  ];
  const octave = Math.floor(n / 12) - 1;
  return `${names[n % 12]}${octave}`;
}

// Type for each note in the MIDI file
interface Note {
  name: string;
  start: number;
  end: number;
  velocity: number;
}
@Injectable()
export class MidiProcessor {
  private midiToTokens(midiPath: string, timebase: number): string {
    const data = fs.readFileSync(midiPath);
    const midi = new Midi(data);

    const tempo = Math.round(midi.header.tempos?.[0]?.bpm || 120);

    const tokens: string[] = [];
    tokens.push(`TEMPO ${tempo}`);
    tokens.push(`TIMEBASE ${timebase}`);

    const secondsPerTick = 60 / tempo / timebase;

    const allNotes: Note[] = [];
    midi.tracks.forEach((track) => {
      track.notes.forEach((note) => {
        allNotes.push({
          name: midiToPitchName(note.midi),
          start: note.time,
          end: note.time + note.duration,
          velocity: Math.round(note.velocity * 127),
        });
      });
    });

    allNotes.sort((a, b) => a.start - b.start);
    let lastTick = 0;

    for (const note of allNotes) {
      const startTick = Math.round(note.start / secondsPerTick);
      const endTick = Math.round(note.end / secondsPerTick);

      const delta = startTick - lastTick;
      if (delta > 0) tokens.push(`TIME_SHIFT ${delta}`);

      tokens.push(`NOTE_ON ${note.name} VELOCITY ${note.velocity}`);
      tokens.push(`NOTE_START ${note.start}`);
      tokens.push(`NOTE_END ${note.end}`);
      const dur = endTick - startTick;
      tokens.push(`TIME_SHIFT ${dur}`);

      tokens.push(`NOTE_OFF ${note.name}`);

      lastTick = endTick;
    }

    return tokens.join('\n');
  }

  public convertMidiToTokens(midiPath: string, timebase: number): string {
    const resolved = path.resolve(midiPath);

    if (!fs.existsSync(resolved)) {
      console.error('File not found:', resolved);
      process.exit(1);
    }

    const tokens = this.midiToTokens(midiPath, timebase);
    console.log(tokens);
    return tokens;
  }
}
