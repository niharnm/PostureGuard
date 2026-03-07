"use client";

type Props = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  className?: string;
};

export function PoseOverlayCanvas({ canvasRef, className }: Props) {
  return <canvas ref={canvasRef} className={className} />;
}
