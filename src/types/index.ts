export type DurationMinutes = 5 | 15 | 25 | 45 | 60 | number;

export type ImageSourceKind = 'art' | 'quote' | 'custom';

export interface Quote {
  id: string;
  text: string;
  author: string;
}

export interface ArtImageRef {
  kind: 'art';
  id: string;
  uri: number;
}

export interface QuoteImageRef {
  kind: 'quote';
  quote: Quote;
  background: string;
  textColor: string;
}

export interface CustomImageRef {
  kind: 'custom';
  uri: string;
}

// An image chosen from the remote content library (src/content/). `uri` is
// always a local file:// path already resolved from the disk cache — nothing
// downstream needs to know the image came from a network catalog.
export interface RemoteImageRef {
  kind: 'remote';
  uri: string;
  imageId: string;
  title: string;
  attributionText: string | null;
}

export type ImageRef = ArtImageRef | QuoteImageRef | CustomImageRef | RemoteImageRef;

export interface GridDims {
  rows: number;
  cols: number;
}

export interface SessionConfig {
  durationMinutes: number;
  image: ImageRef;
  grid: GridDims;
}

export type SessionOutcome = 'completed' | 'failed';

export type FailureReason = 'left_app' | 'gave_up' | null;

export interface SessionRecord {
  id: string;
  startedAt: number;
  endedAt: number;
  durationMinutes: number;
  grid: GridDims;
  image: ImageRef;
  outcome: SessionOutcome;
  failureReason: FailureReason;
  revealedFraction: number;
}

export interface AppSettings {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
}
