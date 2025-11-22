import { Midi } from '@tonejs/midi';
import fs from 'fs';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TokenProcessor {
  // Convert note name (e.g., "C4") to MIDI number
  private noteToMidi(n: string): number {
    const map: Record<string, number> = {
      C: 0,
      'C#': 1,
      D: 2,
      'D#': 3,
      E: 4,
      F: 5,
      'F#': 6,
      G: 7,
      'G#': 8,
      A: 9,
      'A#': 10,
      B: 11,
    };
    const name = n.replace('♯', '#').toUpperCase();
    const letter = name.slice(0, -1);
    const octave = parseInt(name.slice(-1));
    return map[letter] + (octave + 1) * 12;
  }

  // Parse token lines into events and BPM
  private parseTokens(lines: string[]): { bpm: number; events: Event[] } {
    const events: Event[] = [];
    let time = 0;
    let bpm = 120;

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;

      const parts = line.split(' ');

      if (parts[0] === 'TEMPO') {
        bpm = parseInt(parts[1]);
        continue;
      }

      if (parts[0] === 'TIME_SHIFT') {
        time += parseInt(parts[1]);
        continue;
      }

      if (parts[0] === 'NOTE_ON') {
        events.push({
          type: 'on',
          note: this.noteToMidi(parts[1]),
          velocity: parseInt(parts[3]),
          time,
        });
        time = 0;
        continue;
      }

      if (parts[0] === 'NOTE_OFF') {
        events.push({
          type: 'off',
          note: this.noteToMidi(parts[1]),
          time,
        });
        time = 0;
      }
    }

    return { bpm, events };
  }

  // Main function to process tokens and generate MIDI file
  public processTokens(
    inputTokens: string,
    outputFile: string = 'output.mid',
  ): void {
    // Check if the input file is provided
    if (!inputTokens) {
      console.error('Usage: node tokensToMidi.js <tokens.txt> [output.mid]');
      return;
    }

    // Read the token file
    const lines: string[] = inputTokens.split('\n');

    // Parse the tokens to get bpm and events
    const { bpm, events } = this.parseTokens(lines);

    // Initialize a new, empty MIDI file
    const midi = new Midi();

    // Add the tempo information to the header
    midi.header.tempos.push({ bpm, ticks: 0 });

    // Create a new track
    const track = midi.addTrack();

    let currentTick = 0;
    let activeNotes: Record<number, { start: number; velocity: number }> = {}; // noteNumber → startTick & velocity

    // Process the events to generate MIDI notes
    for (const e of events) {
      currentTick += e.time;

      if (e.type === 'on') {
        activeNotes[e.note] = {
          start: currentTick,
          velocity: e.velocity! / 127, // Ensure velocity is divided by 127
        };
      }

      if (e.type === 'off') {
        const note = activeNotes[e.note];

        if (note) {
          track.addNote({
            midi: e.note,
            ticks: note.start,
            durationTicks: currentTick - note.start,
            velocity: note.velocity,
          });

          delete activeNotes[e.note];
        }
      }
    }

    // Write the MIDI file to disk
    fs.writeFileSync(outputFile, Buffer.from(midi.toArray()));
    console.log('Created MIDI:', outputFile);
  }
}

interface Event {
  type: 'on' | 'off';
  note: number;
  velocity?: number;
  time: number;
}
