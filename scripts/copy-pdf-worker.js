/**
 * 将 pdf.js worker 复制到 public，供开发服务器与演示页同源加载。
 */
const fs = require("fs");
const path = require("path");

const src = path.join(
  __dirname,
  "..",
  "node_modules",
  "pdfjs-dist",
  "build",
  "pdf.worker.min.mjs"
);
const dest = path.join(__dirname, "..", "public", "pdf.worker.min.mjs");

if (!fs.existsSync(src)) {
  console.warn("[copy-pdf-worker] skip: pdfjs-dist not installed yet");
  process.exit(0);
}
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log("[copy-pdf-worker] public/pdf.worker.min.mjs");
