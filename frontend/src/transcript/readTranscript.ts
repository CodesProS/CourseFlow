// Reads a transcript PDF entirely in the browser. The file is never sent
// anywhere — only the course codes the user confirms reach the backend.
//
// Imported lazily (see TranscriptImport) so pdf.js only downloads when
// someone actually uploads a file.

import { GlobalWorkerOptions, Util, getDocument } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { parseTranscript, type ParsedTranscript, type TextPage } from "./parseTranscript";

// Bundled with the app rather than loaded from a CDN, so nothing about the
// file leaves the page.
GlobalWorkerOptions.workerSrc = workerUrl;

export async function readTranscript(file: File): Promise<ParsedTranscript> {
    const data = new Uint8Array(await file.arrayBuffer());
    const task = getDocument({ data, verbosity: 0 });
    const doc = await task.promise;

    try {
        const pages: TextPage[] = [];
        for (let p = 1; p <= doc.numPages; p++) {
            const page = await doc.getPage(p);
            // The transcript is a rotated (landscape) page; the viewport
            // transform maps text into on-screen coordinates.
            const viewport = page.getViewport({ scale: 1 });
            const content = await page.getTextContent();

            const items = [];
            for (const item of content.items) {
                if (!("str" in item) || !item.str.trim()) continue;
                const [, , , , x, y] = Util.transform(viewport.transform, item.transform);
                items.push({ x, y, str: item.str.trim() });
            }
            pages.push({ width: viewport.width, items });
        }
        return parseTranscript(pages);
    } finally {
        await task.destroy();
    }
}
