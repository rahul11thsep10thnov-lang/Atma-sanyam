export interface MusicPick {
  id: string;
  title: string;
  storageKey: string;
  durationSeconds: number;
  license: string;
}

/** Background music source. Music is always subtle and ducked under speech. */
export interface MusicProvider {
  readonly key: string;
  pick(request: { mood: string; minDurationSeconds: number; seed: number }): Promise<MusicPick | null>;
}
