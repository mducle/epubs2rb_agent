import * as pdfjsLib from 'pdfjs-dist';

// Configure worker for Vite / browser environment
if (typeof window !== 'undefined') {
  // Use official CDN worker matching version or fallback
  try {
    const version = pdfjsLib.version || '4.10.38';
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('Could not set PDF.js workerSrc:', e);
  }
}

export interface ExtractedPdfPage {
  pageNumber: number;
  text: string;
}

export interface ExtractedPdfResult {
  fileName: string;
  fileSizeBytes: number;
  totalPages: number;
  pages: ExtractedPdfPage[];
  fullText: string;
}

/**
 * Extracts plain text from an ArrayBuffer, File, or Blob representing a PDF document.
 */
export async function extractTextFromPdf(
  fileOrBuffer: File | Blob | ArrayBuffer,
  onProgress?: (loadedPages: number, totalPages: number) => void
): Promise<ExtractedPdfResult> {
  let arrayBuffer: ArrayBuffer;
  let fileName = 'document.pdf';
  let fileSizeBytes = 0;

  if (fileOrBuffer instanceof File) {
    fileName = fileOrBuffer.name;
    fileSizeBytes = fileOrBuffer.size;
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else if (fileOrBuffer instanceof Blob) {
    fileSizeBytes = fileOrBuffer.size;
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else {
    arrayBuffer = fileOrBuffer;
    fileSizeBytes = arrayBuffer.byteLength;
  }

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages;
    const pages: ExtractedPdfPage[] = [];
    let fullTextAccumulator = '';

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageStrings = textContent.items
          .map((item: any) => (item.str ? item.str : ''))
          .filter(Boolean);

        const pageText = pageStrings.join(' ');
        pages.push({
          pageNumber: pageNum,
          text: pageText,
        });

        fullTextAccumulator += `\n--- [Page ${pageNum}] ---\n` + pageText;

        if (onProgress) {
          onProgress(pageNum, totalPages);
        }
      } catch (pageErr) {
        console.warn(`Error reading page ${pageNum}:`, pageErr);
        pages.push({
          pageNumber: pageNum,
          text: '',
        });
      }
    }

    return {
      fileName,
      fileSizeBytes,
      totalPages,
      pages,
      fullText: fullTextAccumulator.trim(),
    };
  } catch (error: any) {
    console.error('PDF parsing error:', error);
    // Fallback simple byte stream scan for stream texts if pdfjs fails
    const fallbackText = extractTextFromRawPdfBuffer(arrayBuffer);
    if (fallbackText.length > 50) {
      return {
        fileName,
        fileSizeBytes,
        totalPages: 1,
        pages: [{ pageNumber: 1, text: fallbackText }],
        fullText: fallbackText,
      };
    }
    throw new Error(`Failed to parse PDF: ${error.message || 'Corrupt or protected PDF'}`);
  }
}

/**
 * Lightweight fallback string scanner for uncompressed PDF text chunks
 */
function extractTextFromRawPdfBuffer(buffer: ArrayBuffer): string {
  try {
    const uint8 = new Uint8Array(buffer);
    let raw = '';
    const step = 20000;
    for (let i = 0; i < uint8.length; i += step) {
      const slice = uint8.subarray(i, Math.min(uint8.length, i + step));
      raw += String.fromCharCode.apply(null, Array.from(slice));
    }
    // Match uncompressed stream blocks or text objects TJ / Tj
    const textMatches = raw.match(/\(([^()]*)\)\s*T[jJ]/g) || [];
    const extracted = textMatches
      .map((t) => t.replace(/^\(/, '').replace(/\)\s*T[jJ]$/, ''))
      .join(' ');

    return extracted;
  } catch (e) {
    return '';
  }
}
