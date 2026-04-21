import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker
// Use a CDN for the worker to avoid complex vite configuration for workers
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface Attachment {
  id: string;
  name: string;
  type: string; // MIME type
  size: number;
  base64?: string;      // for images
  textContent?: string; // for PDFs and text files
  preview?: string;     // object URL for image thumbnail
}

// Convert image file to base64
export const imageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove dataurl prefix: data:image/png;base64,
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

// Extract text from .txt, .py, .c, .cpp, .m files using FileReader
export const extractText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Extract text from PDF using pdf.js
export const extractPdfText = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText;
};

// Validate file (size, type)
export const validateFile = (file: File): { valid: boolean; error?: string } => {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'text/plain', 'text/x-python', 'text/x-matlab', 'text/x-c', 'text/x-c++'
  ];
  
  // Also check extension for code files which might not have MIME types on all systems
  const ALLOWED_EXTENSIONS = ['.txt', '.py', '.m', '.c', '.cpp'];
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();

  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'File size exceeds 10MB' };
  }

  if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: 'File type not supported' };
  }

  return { valid: true };
};
