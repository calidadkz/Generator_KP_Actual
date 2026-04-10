import html2pdf from 'html2pdf.js';

export const downloadAsPDF = (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Create a temporary container to ensure a clean rendering context
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '210mm';
  container.style.zIndex = '-9999';
  container.style.background = 'white';
  container.style.margin = '0';
  container.style.padding = '0';
  container.style.overflow = 'hidden';
  
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Reset all potential centering/offset styles on the clone
  clone.style.transform = 'none';
  clone.style.margin = '0';
  clone.style.padding = '0';
  clone.style.width = '210mm';
  clone.style.display = 'block';
  clone.style.textAlign = 'left';
  clone.style.position = 'relative';
  clone.style.left = '0';
  clone.style.top = '0';

  // Find all a4-page elements inside the clone and reset their margins/shadows
  const pages = clone.querySelectorAll('.a4-page');
  pages.forEach((page: any) => {
    page.style.margin = '0';
    page.style.boxShadow = 'none';
    page.style.width = '210mm';
    page.style.display = 'block';
    page.style.position = 'relative';
    page.style.left = '0';
    page.style.top = '0';
    page.style.transform = 'none';
  });

  container.appendChild(clone);
  document.body.appendChild(container);

  const opt = {
    margin: 0,
    filename: `${filename}.pdf`,
    image: { type: 'jpeg' as const, quality: 1 },
    html2canvas: { 
      scale: 2, 
      useCORS: true,
      letterRendering: true,
      scrollY: 0,
      scrollX: 0,
      windowWidth: 794, // 210mm in pixels at 96dpi
      backgroundColor: '#ffffff'
    },
    jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] as any }
  };

  html2pdf().set(opt).from(container).save().then(() => {
    document.body.removeChild(container);
  });
};
