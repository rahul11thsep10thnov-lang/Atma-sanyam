import { env } from "../../../config/env";
import { ImageGenerationRequest, ImageGenerationResult, ImageProvider } from "./ImageProvider";

/**
 * Any OpenAI-compatible images API (POST {base}/images/generations,
 * base64 response). Configure IMAGE_PROVIDER=openai-compatible,
 * IMAGE_PROVIDER_API_KEY, IMAGE_PROVIDER_BASE_URL, IMAGE_PROVIDER_MODEL.
 * The negative prompt is folded into the prompt as explicit exclusions
 * because this API has no separate negative-prompt field.
 */
export class OpenAICompatibleImageProvider implements ImageProvider {
  readonly key = "openai-compatible";

  isConfigured(): boolean {
    return !!env.studio.imageProviderApiKey;
  }

  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const landscape = request.width >= request.height;
    const response = await fetch(`${env.studio.imageProviderBaseUrl.replace(/\/$/, "")}/images/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.studio.imageProviderApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.studio.imageProviderModel,
        prompt: `${request.prompt}\n\nStrictly exclude: ${request.negativePrompt}`,
        size: landscape ? "1536x1024" : "1024x1536",
        n: 1,
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Image provider request failed (${response.status}): ${detail.slice(0, 300)}`);
    }
    const data = (await response.json()) as { data: { b64_json?: string; url?: string }[] };
    const first = data.data?.[0];
    if (first?.b64_json) return { image: Buffer.from(first.b64_json, "base64"), format: "png", isPlaceholder: false };
    if (first?.url) {
      const img = await fetch(first.url);
      if (!img.ok) throw new Error(`Failed to download generated image (${img.status})`);
      return { image: Buffer.from(await img.arrayBuffer()), format: "png", isPlaceholder: false };
    }
    throw new Error("Image provider returned no image");
  }
}
