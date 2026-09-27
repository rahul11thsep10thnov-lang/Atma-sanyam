export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  seed: number;
  /** Hints for the offline placeholder renderer (palette consistency). */
  hints?: { timeOfDay?: string; setting?: string; palette?: string[] };
}

export interface ImageGenerationResult {
  image: Buffer;
  format: "png" | "jpg";
  isPlaceholder: boolean;
}

/** Still-image generation for scene backgrounds/illustrations. */
export interface ImageProvider {
  readonly key: string;
  isConfigured(): boolean;
  generate(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
}
