import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  base64?: string;
  textContent?: string;
  preview?: string;
}

export const imageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const extractText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

interface PdfExtractResult {
  text: string;
  pageImages: string[]; // base64 PNGs of pages that had no text
}

export const extractPdfText = async (file: File): Promise<PdfExtractResult> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const MAX_PAGES = 15;
    const textParts: string[] = [];
    const pageImages: string[] = [];
    const endPage = Math.min(pdf.numPages, MAX_PAGES);

    for (let i = 1; i <= endPage; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s{2,}/g, '\n')
        .trim();

      if (pageText.length > 0) {
        textParts.push(`--- Page ${i} ---\n${pageText}`);
      } else {
        // No readable text — try to render this page as an image (scanned page)
        try {
          const scale = 1.5; // 1.5x resolution for decent quality
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            const blob = await new Promise<Blob | null>(resolve =>
              canvas.toBlob(resolve, 'image/png')
            );
            if (blob) {
              const base64 = await blobToBase64(blob);
              pageImages.push(base64);
            }
          }
        } catch {
          // Rendering this page failed — skip it silently
        }
      }
    }

    const fullText = textParts.join('\n\n');
    const MAX_CHARS = 8000;
    return {
      text: fullText.length > MAX_CHARS ? fullText.slice(0, MAX_CHARS) + '\n\n[... content truncated ...]' : fullText,
      pageImages,
    };
  } catch (err) {
    console.error('PDF extraction failed:', err);
    return { text: '', pageImages: [] };
  }
};

export const validateFile = (file: File): { valid: boolean; error?: string } => {
  const MAX_SIZE = 10 * 1024 * 1024;
  const ALLOWED_EXTENSIONS = ['.txt','.py','.m','.c','.cpp','.pdf','.jpg','.jpeg','.png','.gif','.webp'];
  const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
  if (file.size > MAX_SIZE) return { valid: false, error: `Exceeds 10 MB` };
  if (!ALLOWED_EXTENSIONS.includes(ext)) return { valid: false, error: `Unsupported: ${ext}` };
  return { valid: true };
};

export const processFile = async (file: File): Promise<Attachment | null> => {
  const v = validateFile(file);
  if (!v.valid) return null;

  const id = Math.random().toString(36).substr(2, 9);
  const base: Attachment = { id, name: file.name, type: file.type, size: file.size };

  if (file.type.startsWith('image/')) {
    return { ...base, base64: await imageToBase64(file), preview: URL.createObjectURL(file) };
  }
  if (file.type === 'application/pdf') {
    const { text, pageImages } = await extractPdfText(file);
    if (text.trim()) {
      // Normal PDF with extractable text
      return { ...base, textContent: text };
    } else if (pageImages.length > 0) {
      // Scanned/image-based PDF — attach first page as image for vision model
      // Include a note if there are additional pages beyond the first
      return { ...base, base64: pageImages[0], textContent: `[Scanned PDF — ${pageImages.length} page(s) rendered as images for analysis]\n${pageImages.length > 1 ? `Note: ${pageImages.length - 1} additional page(s) could not be included due to size limits.` : ''}` };
    } else {
      // Completely unreadable
      return { ...base, textContent: '[PDF text extraction failed — the file may be corrupted or password-protected]' };
    }
  }
  // Text files — truncate if needed
  const text = await extractText(file);
  const MAX_CHARS = 8000;
  const truncated = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + '\n\n[... content truncated ...]' : text;
  return { ...base, textContent: truncated };
};

export const revokePreview = (att: Attachment) => {
  if (att.preview) URL.revokeObjectURL(att.preview);
};