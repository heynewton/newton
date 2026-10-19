import { extractText, getDocumentProxy } from "unpdf";

/** The text of one page of a PDF. `page` counts from 1, as PDF viewers do. */
export interface PageText {
  page: number;
  text: string;
}

/**
 * The text of each page of a PDF, in order. A page with no text layer (a scan) comes back
 * with empty text: there is no OCR yet, so such a page can't be searched.
 */
export async function extractPages(pdf: Uint8Array): Promise<PageText[]> {
  // pdf.js takes ownership of the buffer it is given, so hand it a copy.
  const document = await getDocumentProxy(new Uint8Array(pdf));
  try {
    const { text } = await extractText(document, { mergePages: false });
    return text.map((pageText, i) => ({ page: i + 1, text: pageText }));
  } finally {
    await document.loadingTask.destroy();
  }
}
