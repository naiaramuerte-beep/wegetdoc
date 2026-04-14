/**
 * SignatureCanvas — completely isolated component.
 * Extracted from PdfEditor to prevent re-renders of the parent
 * from unmounting/remounting the canvas (which clears its content).
 */
import React, { useRef, useCallback, useEffect } from "react";

interface SignatureCanvasProps {
  color: string;
  strokeWidth: number;
  onPlaceSignature: (dataUrl: string) => void;
  onClear?: () => void;
  clearLabel?: string;
  placeLabel?: string;
}

const SignatureCanvas = React.memo(function SignatureCanvas({
  color,
  strokeWidth,
  onPlaceSignature,
  clearLabel = "Limpiar",
  placeLabel = "Insertar firma",
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const hasContent = useRef(false);

  // Sync canvas internal size to its CSS display size once on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0) {
      canvas.width = Math.round(rect.width);
      canvas.height = Math.round(rect.height);
    }
  }, []);

  const getCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const drawDot = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(x, y, strokeWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    hasContent.current = true;
  }, [color, strokeWidth]);

  const drawLine = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    hasContent.current = true;
  }, [color, strokeWidth]);

  // ── Mouse handlers ──────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pt = getCoords(e.clientX, e.clientY);
    isDrawing.current = true;
    lastPoint.current = pt;
    drawDot(pt.x, pt.y);
  }, [getCoords, drawDot]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !lastPoint.current) return;
    e.preventDefault();
    const pt = getCoords(e.clientX, e.clientY);
    drawLine(lastPoint.current, pt);
    lastPoint.current = pt;
  }, [getCoords, drawLine]);

  const onMouseUp = useCallback(() => {
    isDrawing.current = false;
    lastPoint.current = null;
  }, []);

  const onMouseLeave = useCallback(() => {
    isDrawing.current = false;
    lastPoint.current = null;
  }, []);

  // ── Touch handlers ──────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const pt = getCoords(touch.clientX, touch.clientY);
    isDrawing.current = true;
    lastPoint.current = pt;
    drawDot(pt.x, pt.y);
  }, [getCoords, drawDot]);

  const onTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing.current || !lastPoint.current) return;
    const touch = e.touches[0];
    const pt = getCoords(touch.clientX, touch.clientY);
    drawLine(lastPoint.current, pt);
    lastPoint.current = pt;
  }, [getCoords, drawLine]);

  const onTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isDrawing.current = false;
    lastPoint.current = null;
  }, []);

  // ── Global mouseup (in case mouse is released outside canvas) ──
  useEffect(() => {
    const handler = () => {
      isDrawing.current = false;
      lastPoint.current = null;
    };
    window.addEventListener("mouseup", handler);
    return () => window.removeEventListener("mouseup", handler);
  }, []);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    hasContent.current = false;
  }, []);

  const handlePlace = useCallback(() => {
    const canvas = canvasRef.current!;
    onPlaceSignature(canvas.toDataURL());
  }, [onPlaceSignature]);

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        width={300}
        height={140}
        className="w-full rounded border-2 border-dashed"
        style={{
          borderColor: "#e2e8f0",
          background: "#fff",
          cursor: "crosshair",
          touchAction: "none",
          display: "block",
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleClear}
          className="flex-1 py-1.5 rounded text-xs font-medium border"
          style={{ borderColor: "#e2e8f0", color: "#64748b" }}
        >
          {clearLabel}
        </button>
        <button
          type="button"
          onClick={handlePlace}
          className="flex-1 py-1.5 rounded text-xs font-medium text-white"
          style={{ background: "#1565C0" }}
        >
          {placeLabel}
        </button>
      </div>
    </div>
  );
});

export default SignatureCanvas;
