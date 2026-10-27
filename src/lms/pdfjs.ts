// pdf.js 本体(約 2MB)。LMS の content script とは別のファイル(dist/lms-pdf.js)にして、PDF を開いたときだけ読み込む
import { getDocument } from "pdfjs-dist";
import * as pdfWorker from "pdfjs-dist/build/pdf.worker.mjs";

// content script からはページ側の制限で Worker を作れないことがあるので、メインスレッドで動かす(この口があれば Worker を作らない)
(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = pdfWorker;

export { getDocument };
