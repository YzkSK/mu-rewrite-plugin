/// <reference types="vite/client" />
// pdf.js の Worker 側の本体(メインスレッドで動かすために読む。型は要らない)
declare module "pdfjs-dist/build/pdf.worker.mjs";
