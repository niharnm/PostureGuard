"use client";

import { memo } from "react";

type Props = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  className?: string;
};

function PoseOverlayCanvasBase({ canvasRef, className }: Props) {
  return <canvas ref={canvasRef} className={className} />;
}

export const PoseOverlayCanvas = memo(PoseOverlayCanvasBase);
