<template>
  <div id="app">
    <p>点击左侧缩略图打开预览（支持图片与 PDF 栅格化）</p>
    <lztElImage
      ref="previewRef"
      :key="demoKey"
      :src="thumbSrc"
      style="width: 120px; height: 120px; cursor: pointer"
      :preview-src-list="previewList"
      :preview-types="previewTypeHints"
    />
    <div class="panel">
      <p><strong>测试数据</strong></p>
      <button type="button" @click="setDemo('img')">仅图片（外链）</button>
      <button type="button" @click="setDemo('pdfMozilla')">
        PDF 链接（Mozilla 示例）
      </button>
      <button type="button" @click="setDemo('pdfW3C')">PDF 链接（W3C dummy）</button>
      <button type="button" @click="setDemo('mixed')">图片 + PDF 混排</button>
      <div class="upload-row">
        <label>
          上传本地 PDF 或图片（可多选）：
          <input type="file" accept=".pdf,image/*" multiple @change="onUpload" />
        </label>
      </div>
      <p class="hint">
        无扩展名、无 MIME 的二进制流请在上传列表里点「指定类型」或选
        <code>preview-types</code> 逻辑自测。
      </p>

      <div v-if="uploadedFiles.length" class="uploaded-block">
        <p><strong>已上传（点击文件名预览）</strong></p>
        <ul class="file-list">
          <li
            v-for="item in uploadedFiles"
            :key="item.id"
            class="file-item"
            @click="openUploadedPreview(item)"
          >
            <span class="file-badge" :data-kind="item.typeHint || 'auto'">{{
              badgeText(item)
            }}</span>
            <span class="file-name" :title="item.name">{{ item.name }}</span>
            <span class="file-action">预览</span>
          </li>
        </ul>
      </div>
      <p v-else class="upload-empty">暂无上传文件</p>
    </div>
  </div>
</template>

<script>
import { renderPdfPagesToBlobUrls } from "../packages/src/utils/pdf-render.js";

const SAMPLE_IMG =
  "https://fuss10.elemecdn.com/8/27/f01c15bb73e1ef3793e64e6b7bbccjpeg.jpeg";
const SAMPLE_IMG2 =
  "https://fuss10.elemecdn.com/1/8e/aeffeb4de74e2fde4bd74fc7b4486jpeg.jpeg";
const SAMPLE_PDF_MOZILLA =
  "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf";
const SAMPLE_PDF_W3C =
  "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

export default {
  name: "App",
  data() {
    return {
      demoKey: 0,
      thumbSrc: SAMPLE_IMG,
      previewList: [SAMPLE_IMG, SAMPLE_IMG2],
      previewTypeHints: [],
      uploadedFiles: [],
      objectUrlsToRevoke: [],
    };
  },
  beforeDestroy() {
    this.objectUrlsToRevoke.forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch (e) {
        /* noop */
      }
    });
  },
  methods: {
    badgeText(item) {
      if (item.typeHint === "pdf") return "PDF";
      if (item.typeHint === "image") return "IMG";
      return "自动";
    },
    pushRevokeUrl(u) {
      if (u) this.objectUrlsToRevoke.push(u);
    },
    setDemo(mode) {
      this.demoKey += 1;
      if (mode === "img") {
        this.thumbSrc = SAMPLE_IMG;
        this.previewList = [SAMPLE_IMG, SAMPLE_IMG2];
        this.previewTypeHints = [];
        return;
      }
      if (mode === "pdfMozilla") {
        this.thumbSrc = SAMPLE_IMG;
        this.previewList = [SAMPLE_PDF_MOZILLA];
        this.previewTypeHints = [];
        return;
      }
      if (mode === "pdfW3C") {
        this.thumbSrc = SAMPLE_IMG;
        this.previewList = [SAMPLE_PDF_W3C];
        this.previewTypeHints = [];
        return;
      }
      if (mode === "mixed") {
        this.thumbSrc = SAMPLE_IMG;
        this.previewList = [SAMPLE_IMG, SAMPLE_PDF_W3C];
        this.previewTypeHints = ["image", "pdf"];
      }
    },
    async onUpload(e) {
      const files = e.target.files;
      if (!files || !files.length) return;
      const base = Date.now();
      let firstEntry = null;
      const uploadedEntries = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isPdf =
          (file.type && file.type.indexOf("pdf") !== -1) || /\.pdf$/i.test(file.name);
        const isImg = file.type && file.type.indexOf("image/") === 0;
        let typeHint = null;
        if (isPdf) typeHint = "pdf";
        else if (isImg) typeHint = "image";
        let thumbUrl = null;
        if (isImg) {
          thumbUrl = URL.createObjectURL(file);
          this.pushRevokeUrl(thumbUrl);
        }
        const entry = {
          id: base + "-" + i + "-" + file.name,
          name: file.name,
          file,
          typeHint,
          thumbUrl,
        };
        this.uploadedFiles.push(entry);
        uploadedEntries.push(entry);
        if (i === 0) firstEntry = entry;
      }
      // 与左侧缩略图一致：否则 thumb 已是 PDF/图片，preview-src-list 仍是示例图时，点缩略会打开错项
      this.previewList = uploadedEntries.map((x) => x.file);
      this.previewTypeHints = uploadedEntries.map((x) =>
        x.typeHint === "pdf" || x.typeHint === "image" ? x.typeHint : null
      );
      await this.syncMainThumbFromUploadedFirst(firstEntry);
      e.target.value = "";
    },
    async syncMainThumbFromUploadedFirst(entry) {
      if (!entry) return;
      if (entry.typeHint === "image" && entry.thumbUrl) {
        this.thumbSrc = entry.thumbUrl;
        return;
      }
      if (entry.typeHint === "pdf") {
        try {
          const urls = await renderPdfPagesToBlobUrls(
            entry.file,
            this.objectUrlsToRevoke,
            { scale: 1.25, maxPages: 1 }
          );
          this.thumbSrc = urls[0] || SAMPLE_IMG;
        } catch (err) {
          console.error(err);
          this.thumbSrc = SAMPLE_IMG;
        }
        return;
      }
      this.thumbSrc = SAMPLE_IMG;
    },
    async openUploadedPreview(item) {
      // 不要在这里改 demoKey：重挂载会与异步栅格化竞争，易导致预览任务被取消或状态错乱
      this.previewList = [item.file];
      this.previewTypeHints = item.typeHint ? [item.typeHint] : [];
      await this.syncMainThumbFromUploadedFirst(item);
      this.$nextTick(() => {
        const root = this.$refs.previewRef && this.$refs.previewRef.$el;
        const img = root && root.querySelector(".el-image__inner");
        if (img) {
          img.click();
        }
      });
    },
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

.panel {
  margin-top: 24px;
  text-align: left;
  max-width: 560px;
  margin-inline: auto;
}

.panel button {
  margin: 4px 8px 4px 0;
}

.upload-row {
  margin-top: 12px;
}

.hint {
  font-size: 12px;
  color: #666;
  margin-top: 12px;
}

.uploaded-block {
  margin-top: 20px;
  padding: 12px 14px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: #fafafa;
}

.file-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  margin: 4px 0;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid transparent;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.file-item:hover {
  background: #ecf5ff;
  border-color: #c6e2ff;
}

.file-badge {
  flex-shrink: 0;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
  background: #909399;
  color: #fff;
}

.file-badge[data-kind="pdf"] {
  background: #f56c6c;
}

.file-badge[data-kind="image"] {
  background: #67c23a;
}

.file-badge[data-kind="auto"] {
  background: #909399;
}

.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.file-action {
  flex-shrink: 0;
  font-size: 12px;
  color: #409eff;
}

.upload-empty {
  margin-top: 16px;
  font-size: 13px;
  color: #909399;
}
</style>
