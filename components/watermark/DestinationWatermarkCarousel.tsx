"use client";

import { useEffect, useRef, useState } from "react";
import type { ImageAsset } from "@/lib/types";

export interface DestinationWatermarkCarouselProps {
  images: ImageAsset[];
  /** Milliseconds between crossfades. Defaults to the spec's 15 seconds. */
  interval?: number;
  /** Watermark opacity — keep within 0.08–0.18 so foreground text stays readable. */
  opacity?: number;
  /** Crossfade duration in milliseconds. */
  transitionDuration?: number;
  className?: string;
}

/**
 * A continuous-loop, crossfading photo watermark used as a subtle backdrop
 * behind destination-related sections (hotels, restaurants, shopping,
 * things-to-do, weather, emergency info, overview, culture, transport…).
 * Every connected section on a destination page should mount its own
 * instance pointed at the same `destination.watermarkImages` array so the
 * whole page breathes together.
 *
 * Respects `prefers-reduced-motion`: the carousel then renders the first
 * image statically with no transition, rather than disabling the
 * watermark outright.
 */
export function DestinationWatermarkCarousel({
  images,
  interval = 15000,
  opacity = 0.12,
  transitionDuration = 1200,
  className = ""
}: DestinationWatermarkCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion || images.length <= 1) return;
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, interval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [images.length, interval, reducedMotion]);

  if (images.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ ["--watermark-opacity" as string]: opacity }}
    >
      {images.map((image, index) => (
        <div
          key={image.url + index}
          className="watermark-layer"
          data-active={reducedMotion ? index === 0 : index === activeIndex}
          style={{
            backgroundImage: `url(${image.url})`,
            transitionDuration: reducedMotion ? "0ms" : `${transitionDuration}ms`
          }}
        />
      ))}
    </div>
  );
}
