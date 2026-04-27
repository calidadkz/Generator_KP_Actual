/**
 * PdfPageCanvas.tsx
 *
 * Renders a single PDF page into a <canvas> using pdfjs-dist.
 *
 * - canvas.style.width/height = CSS px  (use these in coordinate conversions)
 * - canvas.width/height       = physical px × devicePixelRatio  (sharp on HiDPI)
 * - onSizeReady(cssW, cssH) fires after the page is fully rendered
 * - Mouse events (onMouseDown/Move/Up) are forwarded for drag-to-select in TemplateMapper
 */

import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { resolvePdf } from '../../lib/pdfStorage';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PdfPageCanvasProps {
  pdfRef: string;
  pageIndex: number;
  renderScale?: number;
  /** Called once the page finishes rendering with CSS px dimensions */
  onSizeReady?: (cssWidth: number, cssHeight: number) => void;
  onClick?:     (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp?:   (e: React.MouseEvent<HTMLCanvasElement>) => void;
  className?: string;
}

export const PdfPageCanvas: React.FC<PdfPageCanvasProps> = ({
  pdfRef,
  pageIndex,
  renderScale = 1.5,
  onSizeReady,
  onClick,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  className,
}) => {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError  ] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfRef) return;
    let cancelled = false;

    const render = async () => {
      setLoading(true);
      setError(null);

      const buf = await resolvePdf(pdfRef);
      if (!buf) { setError('PDF не найден в IndexedDB'); setLoading(false); return; }

      const pdfDoc  = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
      if (cancelled) return;

      const pdfPage = await pdfDoc.getPage(pageIndex + 1); // pdfjs is 1-based
      if (cancelled) return;

      const dpr      = window.devicePixelRatio || 1;
      const viewport = pdfPage.getViewport({ scale: renderScale });
      const cssW     = viewport.width;
      const cssH     = viewport.height;

      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;

      canvas.width  = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width  = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      canvas.setAttribute('data-css-width',  String(cssW));
      canvas.setAttribute('data-css-height', String(cssH));

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);

      await pdfPage.render({ canvasContext: ctx, viewport }).promise;

      if (!cancelled) {
        setLoading(false);
        onSizeReady?.(cssW, cssH);
      }
    };

    render().catch((err) => {
      if (!cancelled) { setError(String(err)); setLoading(false); }
    });

    return () => { cancelled = true; };
  }, [pdfRef, pageIndex, renderScale]);

  return (
    <div className="relative inline-block">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded min-w-[400px] min-h-[300px]">
          <div className="w-8 h-8 border-2 border-calidad-blue border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center bg-red-50 border border-red-200 rounded p-4 text-red-600 text-xs min-w-[300px]">
          {error}
        </div>
      )}
      <canvas
        ref={canvasRef}
        onClick={onClick}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        className={className}
        style={{
          display: loading || error ? 'none' : 'block',
          cursor: onMouseDown ? 'crosshair' : onClick ? 'crosshair' : 'default',
        }}
      />
    </div>
  );
};
