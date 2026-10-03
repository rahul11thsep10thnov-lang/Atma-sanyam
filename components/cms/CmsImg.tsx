import Image from "next/image";
import type { ImageAsset } from "@/lib/types";
import { OPTIMISED_IMAGE_HOSTS } from "@/lib/cms/hosts";

/**
 * Image element for CMS-managed photos. Local files (downloaded approved
 * images, uploads) and the licensed image hosts listed in next.config go
 * through next/image; generated placeholders (data: URLs) and anything else
 * render as a plain <img> so an unlisted host never breaks a page.
 */
export function CmsImg({ image, className, sizes, priority, fill }: { image: ImageAsset; className?: string; sizes?: string; priority?: boolean; fill?: boolean }) {
  const url = image.url;
  let optimisable = url.startsWith("/");
  if (!optimisable && url.startsWith("https://")) {
    try {
      const host = new URL(url).hostname;
      optimisable = OPTIMISED_IMAGE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
    } catch {
      optimisable = false;
    }
  }
  if (!optimisable) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={image.alt} className={className} loading={priority ? "eager" : "lazy"} decoding="async" />;
  }
  const useFill = fill ?? !(image.width && image.height);
  return <Image src={url} alt={image.alt} fill={useFill} width={useFill ? undefined : image.width} height={useFill ? undefined : image.height} sizes={sizes ?? "100vw"} priority={priority} className={className} />;
}
