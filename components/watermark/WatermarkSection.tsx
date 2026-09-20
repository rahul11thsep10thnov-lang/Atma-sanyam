import type { ReactNode } from "react";
import type { ImageAsset } from "@/lib/types";
import { DestinationWatermarkCarousel } from "./DestinationWatermarkCarousel";

/**
 * Thin layout wrapper so every destination-page section (hotels,
 * restaurants, shopping, things-to-do, weather, emergency, overview,
 * culture, transport…) gets the same watermark treatment with one line:
 *   <WatermarkSection images={destination.watermarkImages}>...</WatermarkSection>
 */
export function WatermarkSection({
  images,
  children,
  as: Tag = "section",
  className = "",
  id
}: {
  images: ImageAsset[];
  children: ReactNode;
  as?: "section" | "div";
  className?: string;
  id?: string;
}) {
  return (
    <Tag id={id} className={`relative overflow-hidden ${className}`}>
      <DestinationWatermarkCarousel images={images} />
      <div className="relative z-10">{children}</div>
    </Tag>
  );
}
