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

export const extractText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

export const extractPdfText = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const MAX_PAGES = 15; // limit to first 15 pages to avoid token overflow
    const parts: string[] = [];
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
        parts.push(`--- Page ${i} ---\n${pageText}`);
      }
    }
    const fullText = parts.join('\n\n');
    // Truncate to ~8000 chars to stay well within token limits
    const MAX_CHARS = 8000;
    return fullText.length > MAX_CHARS ? fullText.slice(0, MAX_CHARS) + '\n\n[... content truncated ...]' : fullText;
  } catch (err) {
    console.error('PDF extraction failed:', err);
    return '';
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
    const text = await extractPdfText(file);
    if (!text.trim()) {
      return { ...base, textContent: '[PDF text extraction failed — the file may be scanned or image-based]' };
    }
    return { ...base, textContent: text };
  }
  // Truncate text files as well
  const text = await extractText(file);
  const MAX_CHARS = 8000;
  const truncated = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + '\n\n[... content truncated ...]' : text;
  return { ...base, textContent: truncated };
};

export const revokePreview = (att: Attachment) => {
  if (att.preview) URL.revokeObjectURL(att.preview);
};