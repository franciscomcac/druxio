import { useState, useRef, useCallback, useEffect } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ZoomableImageProps {
  src: string;
}

const ZoomableImage = ({ src }: ZoomableImageProps) => {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const clampScale = (s: number) => Math.min(Math.max(s, 1), 5);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale((prev) => {
      const next = clampScale(prev + delta);
      if (next === 1) setTranslate({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (scale <= 1) return;
    e.stopPropagation();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    translateStart.current = { ...translate };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [scale, translate]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    e.stopPropagation();
    setTranslate({
      x: translateStart.current.x + (e.clientX - dragStart.current.x),
      y: translateStart.current.y + (e.clientY - dragStart.current.y),
    });
  }, [isDragging]);

  const handlePointerUp = useCallback(() => setIsDragging(false), []);

  const reset = () => { setScale(1); setTranslate({ x: 0, y: 0 }); };

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale > 1) { reset(); } else { setScale(2.5); }
  }, [scale]);

  // Reset on image change
  useEffect(() => { reset(); }, [src]);

  return (
    <div className="relative flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
      {/* Zoom controls */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-black/50 rounded-full px-2 py-1 backdrop-blur-sm">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10"
          onClick={() => setScale((s) => { const n = clampScale(s - 0.5); if (n === 1) setTranslate({ x: 0, y: 0 }); return n; })}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-white/70 text-xs min-w-[3rem] text-center select-none">{Math.round(scale * 100)}%</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10"
          onClick={() => setScale((s) => clampScale(s + 0.5))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        {scale > 1 && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div
        ref={containerRef}
        className="overflow-hidden max-h-[88vh] max-w-[88vw] rounded-xl"
        onWheel={handleWheel}
        style={{ cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in" }}
      >
        <img
          src={src}
          alt="Full size"
          draggable={false}
          onDoubleClick={handleDoubleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="select-none transition-transform duration-100"
          style={{
            transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
            boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
            transformOrigin: "center center",
          }}
        />
      </div>
    </div>
  );
};

export default ZoomableImage;