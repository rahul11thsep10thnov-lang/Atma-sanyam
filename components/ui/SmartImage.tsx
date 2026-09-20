import Image from "next/image";
import type { ImageAsset } from "@/lib/types";

/**
 * next/image's optimizer can't process data: URLs, which is what our
 * placeholder image system currently generates (see lib/data/placeholder.ts).
 * This wrapper renders those with a plain <img> and switches to next/image
 * automatically once a destination's `images` array holds real, licensed
 * photography served from an http(s) URL.
 */
export function SmartImage({
  image,
  className,
  sizes,
  priority
}: {
  image: ImageAsset;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (image.url.startsWith("data:")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image.url} alt={image.alt} className={className} loading={priority ? "eager" : "lazy"} />;
  }

  return (
    <Image
      src={image.url}
      alt={image.alt}
      fill={!image.width || !image.height}
      width={image.width}
      height={image.height}
      sizes={sizes ?? "100vw"}
      priority={priority}
      className={className}
    />
  );
}
