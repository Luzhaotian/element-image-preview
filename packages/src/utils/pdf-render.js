/**
 * 使用 pdf.js 将 PDF 逐页渲染为 PNG blob URL，供图片预览使用。
 * 静态导入，保证 UMD 单文件可独立工作。
 *
 * Worker 默认同源 `public/pdf.worker.min.mjs`（见 `npm run sync-pdf-worker`），
 * 也可设置 `window.__LZT_PDFJS_WORKER__`。
 * 调试日志：`window.__LZT_PDF_DEBUG__ = true` 后刷新。
 */

import * as pdfjsModule from "pdfjs-dist/legacy/build/pdf.mjs";

const PDFJS_VERSION = "4.6.82";

let workerConfigured = false;

function pdfDebug(...args) {
  if (typeof window === "undefined" || window.__LZT_PDF_DEBUG__ !== true) {
    return;
  }
  console.log("[LZT-PDF]", ...args);
}

function computeWorkerSrc(pdfjs) {
  const ver = pdfjs.version || PDFJS_VERSION;
  if (typeof window !== "undefined" && window.__LZT_PDFJS_WORKER__) {
    return window.__LZT_PDFJS_WORKER__;
  }
  const base =
    typeof process !== "undefined" &&
    process.env &&
    process.env.BASE_URL != null
      ? String(process.env.BASE_URL)
      : "/";
  const withSlash = base.endsWith("/") ? base : base + "/";
  if (typeof window !== "undefined") {
    try {
      const originBase = new URL(withSlash, window.location.href).href;
      return new URL("pdf.worker.min.mjs", originBase).href;
    } catch (e) {
      /* fall through */
    }
  }
  return `https://cdn.jsdelivr.net/npm/pdfjs-dist@${ver}/build/pdf.worker.min.mjs`;
}

function ensurePdfWorker(pdfjs) {
  if (workerConfigured || typeof window === "undefined") return;
  const src = computeWorkerSrc(pdfjs);
  pdfjs.GlobalWorkerOptions.workerSrc = src;
  workerConfigured = true;
  pdfDebug("workerSrc", src);
}

function getPdfjs() {
  ensurePdfWorker(pdfjsModule);
  return pdfjsModule;
}

function withTimeout(promise, ms, message, onTimeout) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => {
        if (typeof onTimeout === "function") {
          try {
            onTimeout();
          } catch (e) {
            console.warn("[LZT-PDF] onTimeout", e);
          }
        }
        reject(new Error(message || "timeout"));
      }, ms)
    ),
  ]);
}

/** 串行化 getDocument，避免缩略图与全屏预览并发抢同一 worker */
let pdfRenderChain = Promise.resolve();

function enqueuePdfRender(fn) {
  const next = pdfRenderChain.then(() => fn(), () => fn());
  pdfRenderChain = next.catch(() => {});
  return next;
}

/**
 * 将预览项解析为 pdf.js getDocument 参数
 */
export async function getPdfDocumentParams(rawEntry) {
  let entry = rawEntry;
  if (
    entry &&
    typeof entry === "object" &&
    !(entry instanceof Blob) &&
    !(entry instanceof ArrayBuffer) &&
    !ArrayBuffer.isView(entry)
  ) {
    if (entry.blob != null) entry = entry.blob;
    else if (entry.src != null) entry = entry.src;
    else if (entry.url != null) entry = entry.url;
  }
  if (entry == null) return null;
  if (typeof entry === "string") {
    return { url: entry };
  }
  if (entry instanceof Blob) {
    const buf = await entry.arrayBuffer();
    return { data: new Uint8Array(buf.slice(0)) };
  }
  if (entry instanceof ArrayBuffer) {
    return { data: new Uint8Array(entry.slice(0)) };
  }
  if (ArrayBuffer.isView(entry)) {
    return {
      data: new Uint8Array(
        entry.buffer.slice(
          entry.byteOffset,
          entry.byteOffset + entry.byteLength
        )
      ),
    };
  }
  return null;
}

async function renderPdfPagesToBlobUrlsInnerWithTask(
  loadingTask,
  revokeList,
  options
) {
  const scale = options && options.scale != null ? options.scale : 2;
  pdfDebug("await document…");
  try {
    const pdf = await loadingTask.promise;
    pdfDebug("numPages=", pdf.numPages);
    const out = [];
    const cap =
      options && options.maxPages != null
        ? Math.min(options.maxPages, pdf.numPages)
        : pdf.numPages;

    for (let p = 1; p <= cap; p++) {
      try {
        const page = await pdf.getPage(p);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const renderTask = page.render({
          canvasContext: ctx,
          viewport,
          canvas,
        });
        await renderTask.promise;
        const blob = await new Promise((resolve) => {
          canvas.toBlob((b) => resolve(b), "image/png");
        });
        if (!blob) {
          throw new Error("canvas.toBlob failed");
        }
        const u = URL.createObjectURL(blob);
        if (Array.isArray(revokeList)) {
          revokeList.push(u);
        }
        out.push(u);
        pdfDebug("page", p, "/", cap, "ok");
      } catch (pageErr) {
        console.warn(
          "[lzt-element-image-preview] PDF 第 " + p + " 页渲染失败",
          pageErr
        );
      }
    }
    if (!out.length) {
      throw new Error("未能渲染出任何 PDF 页面（可能单页尺寸过大或文件损坏）");
    }
    return out;
  } finally {
    try {
      if (!loadingTask.destroyed) {
        await loadingTask.destroy();
      }
    } catch (dErr) {
      pdfDebug("destroy", dErr && dErr.message);
    }
  }
}

/**
 * @param {*} rawEntry 与预览列表单项相同
 * @param {string[]} revokeList 生成的 blob URL 会 push 到此数组，便于统一 revoke
 * @param {{ scale?: number, maxPages?: number, timeoutMs?: number }} options
 * @returns {Promise<string[]>} 每页一张 PNG 的 object URL
 */
export async function renderPdfPagesToBlobUrls(rawEntry, revokeList, options) {
  const timeoutMs =
    options && options.timeoutMs != null ? options.timeoutMs : 120000;

  return enqueuePdfRender(() => {
    let loadingTaskForTimeout = null;
    const innerPromise = (async () => {
      const params = await getPdfDocumentParams(rawEntry);
      if (!params || (!params.url && !params.data)) {
        throw new Error("Invalid PDF source");
      }
      const pdfjs = getPdfjs();
      const loadingTask = pdfjs.getDocument({
        ...params,
        verbosity: 0,
      });
      loadingTaskForTimeout = loadingTask;
      try {
        return await renderPdfPagesToBlobUrlsInnerWithTask(
          loadingTask,
          revokeList,
          options
        );
      } finally {
        loadingTaskForTimeout = null;
      }
    })();

    return withTimeout(
      innerPromise,
      timeoutMs,
      "PDF 渲染超时（请确认 pdf.worker.min.mjs 与页面同源可访问，或设置 window.__LZT_PDFJS_WORKER__）",
      () => {
        const t = loadingTaskForTimeout;
        if (t && typeof t.destroy === "function" && !t.destroyed) {
          t.destroy().catch(() => {});
        }
      }
    );
  });
}
