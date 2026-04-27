/**
 * contractPdf.ts
 *
 * Contract-specific PDF export using html2canvas + pdf-lib.
 * Each .a4-page element is rendered to a canvas and embedded as a JPEG
 * page in the resulting PDF document.
 */

import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';

const A4_WIDTH_PT = 595;
const A4_HEIGHT_PT = 842;

/**
 * Renders all .a4-page elements inside `elementId` to a multi-page A4 PDF.
 */
export const downloadAsPDF = async (elementId: string, filename: string): Promise<void> => {
  const root = document.getElementById(elementId);
  if (!root) throw new Error(`Element #${elementId} not found`);

  // Collect all .a4-page elements; fall back to the root itself
  let pages = Array.from(root.querySelectorAll<HTMLElement>('.a4-page'));
  if (pages.length === 0) pages = [root];

  const pdfDoc = await PDFDocument.create();

  for (const page of pages) {
    // Temporarily ensure the page is visible at normal size for canvas capture
    const prevTransform = page.style.transform;
    const prevPosition = page.style.position;
    page.style.transform = 'none';

    const canvas = await html2canvas(page, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollY: 0,
      scrollX: 0,
    });

    page.style.transform = prevTransform;
    page.style.position = prevPosition;

    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const jpegBytes = await fetch(jpegDataUrl).then((r) => r.arrayBuffer());
    const img = await pdfDoc.embedJpg(jpegBytes);

    const pdfPage = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);

    // Scale the image to fit A4 (preserve aspect ratio)
    const imgAspect = img.width / img.height;
    const pageAspect = A4_WIDTH_PT / A4_HEIGHT_PT;
    let drawWidth = A4_WIDTH_PT;
    let drawHeight = A4_HEIGHT_PT;
    if (imgAspect > pageAspect) {
      drawHeight = A4_WIDTH_PT / imgAspect;
    } else {
      drawWidth = A4_HEIGHT_PT * imgAspect;
    }

    pdfPage.drawImage(img, {
      x: (A4_WIDTH_PT - drawWidth) / 2,
      y: (A4_HEIGHT_PT - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
