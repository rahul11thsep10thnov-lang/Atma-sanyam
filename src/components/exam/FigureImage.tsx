import { cn } from "@/lib/utils";

/** Figure drawn by the API's figure engine. Shown as an <img> with a data URL,
 * so an SVG can never run scripts or load anything. */
export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function FigureImage({ svg, alt, className }: { svg: string; alt: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={svgDataUrl(svg)} alt={alt} className={cn("h-auto select-none", className ?? "max-w-full")} draggable={false} />
  );
}
