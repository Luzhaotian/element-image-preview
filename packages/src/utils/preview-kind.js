/** 预览类型推断：URL / Blob(ArrayBuffer) / 显式 hint */

export const PREVIEW_KIND = {
  IMAGE: "image",
  PDF: "pdf",
  UNKNOWN: "unknown",
};

function isPdfMagic(buf) {
  if (!buf || buf.byteLength < 4) return false;
  const u = new Uint8Array(buf);
  return u[0] === 0x25 && u[1] === 0x50 && u[2] === 0x44 && u[3] === 0x46;
}

function isJpegMagic(buf) {
  if (!buf || buf.byteLength < 3) return false;
  const u = new Uint8Array(buf);
  return u[0] === 0xff && u[1] === 0xd8 && u[2] === 0xff;
}

function isPngMagic(buf) {
  if (!buf || buf.byteLength < 4) return false;
  const u = new Uint8Array(buf);
  return (
    u[0] === 0x89 &&
    u[1] === 0x50 &&
    u[2] === 0x4e &&
    u[3] === 0x47
  );
}

function isGifMagic(buf) {
  if (!buf || buf.byteLength < 4) return false;
  const u = new Uint8Array(buf);
  return u[0] === 0x47 && u[1] === 0x49 && u[2] === 0x46 && u[3] === 0x38;
}

export function imageMimeFromMagic(buf) {
  if (isJpegMagic(buf)) return "image/jpeg";
  if (isPngMagic(buf)) return "image/png";
  if (isGifMagic(buf)) return "image/gif";
  return "application/octet-stream";
}

/**
 * @param {*} entry 字符串 URL、Blob/File、ArrayBuffer、或 { src|url|blob, type? }
 * @returns {'image'|'pdf'|'unknown'}
 */
export function inferPreviewKind(entry) {
  if (entry == null) return PREVIEW_KIND.UNKNOWN;

  if (
    typeof entry === "object" &&
    !(entry instanceof Blob) &&
    !ArrayBuffer.isView(entry) &&
    !(entry instanceof ArrayBuffer)
  ) {
    const t = (entry.type || entry.kind || "").toString().toLowerCase();
    if (t === "pdf" || t === "application/pdf") return PREVIEW_KIND.PDF;
    if (t === "image" || t.indexOf("image/") === 0) return PREVIEW_KIND.IMAGE;
    if (entry.blob != null) return inferPreviewKind(entry.blob);
    if (entry.src != null) return inferPreviewKind(entry.src);
    if (entry.url != null) return inferPreviewKind(entry.url);
  }

  if (typeof entry === "string") {
    const s = entry.trim();
    if (!s) return PREVIEW_KIND.UNKNOWN;
    const dataM = /^data:([^;,]+)[;,]/i.exec(s);
    if (dataM) {
      const mime = dataM[1].toLowerCase();
      if (mime.indexOf("pdf") !== -1) return PREVIEW_KIND.PDF;
      if (mime.indexOf("image/") === 0) return PREVIEW_KIND.IMAGE;
      return PREVIEW_KIND.UNKNOWN;
    }
    if (/\.pdf(\?|#|$)/i.test(s)) return PREVIEW_KIND.PDF;
    if (/\.(jpe?g|png|gif|webp|bmp|svg)(\?|#|$)/i.test(s))
      return PREVIEW_KIND.IMAGE;
    try {
      const u = new URL(s);
      const path = u.pathname.toLowerCase();
      if (path.endsWith(".pdf")) return PREVIEW_KIND.PDF;
      if (/\.(jpe?g|png|gif|webp|bmp|svg)$/.test(path))
        return PREVIEW_KIND.IMAGE;
    } catch (e) {
      /* relative */
    }
    if (s.indexOf("blob:") === 0) return PREVIEW_KIND.UNKNOWN;
    return PREVIEW_KIND.UNKNOWN;
  }

  if (entry instanceof Blob) {
    const t = (entry.type || "").toLowerCase();
    if (t.indexOf("pdf") !== -1) return PREVIEW_KIND.PDF;
    if (t.indexOf("image/") === 0) return PREVIEW_KIND.IMAGE;
    if (entry instanceof File && entry.name && /\.pdf$/i.test(entry.name))
      return PREVIEW_KIND.PDF;
    if (entry instanceof File && /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(entry.name))
      return PREVIEW_KIND.IMAGE;
    return PREVIEW_KIND.UNKNOWN;
  }

  if (entry instanceof ArrayBuffer) {
    if (isPdfMagic(entry)) return PREVIEW_KIND.PDF;
    if (isJpegMagic(entry) || isPngMagic(entry) || isGifMagic(entry))
      return PREVIEW_KIND.IMAGE;
    return PREVIEW_KIND.UNKNOWN;
  }

  if (ArrayBuffer.isView(entry)) {
    const buf = entry.buffer.slice(
      entry.byteOffset,
      entry.byteOffset + entry.byteLength
    );
    return inferPreviewKind(buf);
  }

  return PREVIEW_KIND.UNKNOWN;
}
