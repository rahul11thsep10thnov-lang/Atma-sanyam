import { Position } from "../types";

export interface PixelBox {
  left: number;
  top: number;
  width: number | undefined;
  height: number | undefined;
}

export function toPixelBox(position: Position, videoWidth: number, videoHeight: number): PixelBox {
  return {
    left: position.x * videoWidth,
    top: position.y * videoHeight,
    width: position.width != null ? position.width * videoWidth : undefined,
    height: position.height != null ? position.height * videoHeight : undefined,
  };
}
