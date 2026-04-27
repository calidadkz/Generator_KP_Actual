/**
 * pdfGenerator.ts
 *
 * Generates a КП PDF by overlaying text inside rectangular bounding boxes
 * on a designer PDF template.
 *
 * Each FieldPin defines a rectangle (x, y, width, height) in pdf-lib points
 * where the variable value must fit. Text is word-wrapped within the width
 * and clipped at the bottom of the box.
 *
 * Manager-side FieldFormatOverride values (align, padding, fontFamily, color)
 * take precedence over template pin defaults.
 */

import { PDFDocument, rgb, PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { resolvePdf } from './pdfStorage';
import type { PdfTemplate, FieldFormatOverride } from '../types';

// A4 page dimensions in pdf-lib points
export const PAGE_W_PT = 595;
export const PAGE_H_PT = 842;

// ── Font cache ────────────────────────────────────────────────────────────────

type FontPair = { regular: ArrayBuffer; bold: ArrayBuffer };

const fontCache: Record<string, FontPair> = {};

const FONT_FILES: Record<string, { regular: string; bold: string }> = {
  'inter':      { regular: '/fonts/Inter-Regular.woff',    bold: '/fonts/Inter-Bold.woff'    },
  'roboto':     { regular: '/fonts/Roboto-Regular.woff',   bold: '/fonts/Roboto-Bold.woff'   },
  'open-sans':  { regular: '/fonts/OpenSans-Regular.woff', bold: '/fonts/OpenSans-Bold.woff' },
  'pt-serif':   { regular: '/fonts/PTSerif-Regular.woff',  bold: '/fonts/PTSerif-Bold.woff'  },
};

const loadFontFamily = async (family: string): Promise<FontPair> => {
  if (fontCache[family]) return fontCache[family];
  const files = FONT_FILES[family] ?? FONT_FILES['inter'];
  const [regular, bold] = await Promise.all([
    fetch(files.regular).then((r) => r.arrayBuffer()),
    fetch(files.bold).then((r) => r.arrayBuffer()),
  ]);
  fontCache[family] = { regular, bold };
  return fontCache[family];
};

/** Preload all font families required by the given overrides + template defaults */
const preloadFonts = async (
  families: Set<string>,
): Promise<void> => {
  await Promise.all(Array.from(families).map(loadFontFamily));
};

// ── Color ─────────────────────────────────────────────────────────────────────

/** Parse "#rrggbb" hex color to pdf-lib rgb() */
const hexToRgb = (hex: string) => {
  const c = hex.replace('#', '').padEnd(6, '0');
  return rgb(
    parseInt(c.slice(0, 2), 16) / 255,
    parseInt(c.slice(2, 4), 16) / 255,
    parseInt(c.slice(4, 6), 16) / 255,
  );
};

// ── Coordinate conversion ─────────────────────────────────────────────────────

/**
 * Converts canvas drag coordinates (CSS px, top-left origin) to a pdf-lib
 * bounding box (pts, bottom-left origin).
 */
export const canvasRectToPdfBox = (
  x1: number, y1: number,
  x2: number, y2: number,
  cssW: number, cssH: number,
): { x: number; y: number; width: number; height: number } => {
  const scaleX = PAGE_W_PT / cssW;
  const scaleY = PAGE_H_PT / cssH;

  const leftPx   = Math.min(x1, x2);
  const topPx    = Math.min(y1, y2);
  const rightPx  = Math.max(x1, x2);
  const bottomPx = Math.max(y1, y2);

  const pdfX      = Math.round(leftPx   * scaleX);
  const pdfWidth  = Math.round((rightPx  - leftPx)  * scaleX);
  const pdfHeight = Math.round((bottomPx - topPx)   * scaleY);
  const pdfY      = Math.round(PAGE_H_PT - bottomPx * scaleY);

  return { x: pdfX, y: pdfY, width: pdfWidth, height: pdfHeight };
};

/** Backward-compatible single-click coord converter */
export const canvasToPdfCoords = (
  clickX: number, clickY: number,
  cssW: number, cssH: number,
  pageWidthPt = PAGE_W_PT,
  pageHeightPt = PAGE_H_PT,
) => ({
  x: clickX / (cssW / pageWidthPt),
  y: pageHeightPt - clickY / (cssH / pageHeightPt),
});

// ── Text wrapping ─────────────────────────────────────────────────────────────

/**
 * Splits `text` into lines that fit within `maxWidthPt` using pdf-lib font
 * metrics. Falls back to char-by-char splitting for very long words.
 */
function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidthPt: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidthPt) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      if (font.widthOfTextAtSize(word, fontSize) > maxWidthPt) {
        let chars = '';
        for (const ch of word) {
          if (font.widthOfTextAtSize(chars + ch, fontSize) <= maxWidthPt) {
            chars += ch;
          } else {
            if (chars) lines.push(chars);
            chars = ch;
          }
        }
        line = chars;
      } else {
        line = word;
      }
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

// ── PDF generation ────────────────────────────────────────────────────────────

/**
 * Generates a КП PDF from a PdfTemplate + free-form values map.
 *
 * @param template   - the PDF template with field pin geometry
 * @param values     - key → text content filled by the manager
 * @param overrides  - key → formatting override (align, padding, fontFamily, color)
 *                     set by the manager at fill time; merges with pin defaults
 */
export const generateKpPdf = async (
  template: PdfTemplate,
  values: Record<string, string>,
  overrides: Record<string, FieldFormatOverride> = {},
): Promise<Uint8Array> => {
  const pdfBytes = await resolvePdf(template.basePdfRef);
  if (!pdfBytes) throw new Error(`PDF не найден: ${template.basePdfRef}`);

  // Collect all font families needed
  const familiesNeeded = new Set<string>(['inter']);
  for (const pin of template.fields) {
    const key = pin.key;
    const family = overrides[key]?.fontFamily ?? pin.fontFamily ?? 'inter';
    familiesNeeded.add(family);
  }
  await preloadFonts(familiesNeeded);

  const pdfDoc = await PDFDocument.load(pdfBytes);
  pdfDoc.registerFontkit(fontkit);

  // Embed all needed font families into the document
  const embeddedFonts: Record<string, { regular: PDFFont; bold: PDFFont }> = {};
  for (const family of familiesNeeded) {
    const pair = fontCache[family];
    embeddedFonts[family] = {
      regular: await pdfDoc.embedFont(pair.regular),
      bold:    await pdfDoc.embedFont(pair.bold),
    };
  }

  const pages = pdfDoc.getPages();

  for (const pin of template.fields) {
    const pdfPage = pages[pin.page];
    if (!pdfPage) continue;

    const rawValue = (values[pin.key] ?? '').trim();
    if (!rawValue) continue;

    // Merge pin defaults with manager overrides
    const fmt = overrides[pin.key] ?? {};
    const family    = fmt.fontFamily ?? pin.fontFamily ?? 'inter';
    const align     = fmt.align      ?? pin.align      ?? 'left';
    const padX      = fmt.paddingX   ?? pin.paddingX   ?? 0;
    const padY      = fmt.paddingY   ?? pin.paddingY   ?? 0;
    const colorHex  = fmt.color      ?? pin.color      ?? '#000000';

    const fontPair  = embeddedFonts[family] ?? embeddedFonts['inter'];
    const font      = pin.fontWeight === 'bold' ? fontPair.bold : fontPair.regular;
    const color     = hexToRgb(colorHex);
    const fs        = pin.fontSize;

    const boxW = pin.width  || 200;
    const boxH = pin.height || 100;
    const innerW = Math.max(boxW - padX * 2, 10);

    const lines      = wrapText(rawValue, font, fs, innerW);
    const lineHeight = fs * 1.25;

    let baselineY  = pin.y + boxH - padY - fs;
    const bottomClip = pin.y + padY + fs * 0.3;

    for (const lineText of lines) {
      if (baselineY < bottomClip) break;

      let drawX = pin.x + padX;
      if (align === 'center' || align === 'right') {
        const textW = font.widthOfTextAtSize(lineText, fs);
        if (align === 'center') drawX = pin.x + padX + (innerW - textW) / 2;
        else                    drawX = pin.x + padX + (innerW - textW);
      }

      pdfPage.drawText(lineText, { x: drawX, y: baselineY, size: fs, font, color });
      baselineY -= lineHeight;
    }
  }

  return pdfDoc.save();
};

/** Triggers a browser file download of PDF bytes */
export const downloadPdf = (bytes: Uint8Array, filename: string): void => {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
