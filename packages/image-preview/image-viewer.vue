<template>
  <transition name="viewer-fade">
    <div
      tabindex="-1"
      ref="el-image-viewer__wrapper"
      class="el-image-viewer__wrapper"
      :style="{ 'z-index': viewerZIndex }"
    >
      <div
        class="el-image-viewer__mask"
        :class="previewMaskClass"
        :style="previewMaskStyle"
        @click.self="handleMaskClick"
      ></div>
      <!-- CLOSE -->
      <span class="el-image-viewer__btn el-image-viewer__close" @click="hide">
        <i class="el-icon-close"></i>
      </span>
      <!-- ARROW -->
      <template v-if="!isSingle">
        <span
          class="el-image-viewer__btn el-image-viewer__prev"
          :class="{ 'is-disabled': !infinite && isFirst }"
          @click="prev"
        >
          <i class="el-icon-arrow-left" />
        </span>
        <span
          class="el-image-viewer__btn el-image-viewer__next"
          :class="{ 'is-disabled': !infinite && isLast }"
          @click="next"
        >
          <i class="el-icon-arrow-right" />
        </span>
      </template>
      <!-- ACTIONS（仅图片页：PDF 已栅格化为图片，与图片一致） -->
      <div
        v-if="currentKind === 'image' && !rasterLoading"
        class="el-image-viewer__btn el-image-viewer__actions"
      >
        <div class="el-image-viewer__actions__inner">
          <i class="el-icon-zoom-out" @click="handleActions('zoomOut')"></i>
          <i class="el-icon-zoom-in" @click="handleActions('zoomIn')"></i>
          <i class="el-image-viewer__actions__divider"></i>
          <i :class="mode.icon" @click="toggleMode"></i>
          <i class="el-image-viewer__actions__divider"></i>
          <i class="el-icon-refresh-left" @click="handleActions('anticlocelise')"></i>
          <i class="el-icon-refresh-right" @click="handleActions('clocelise')"></i>
        </div>
      </div>
      <!-- CANVAS -->
      <div class="el-image-viewer__canvas">
        <div v-if="rasterLoading" class="el-image-viewer__raster-loading">
          {{ t("el.image.pdfRasterLoading") }}
        </div>
        <template v-else>
          <img
            v-if="currentKind === 'image'"
            ref="img"
            class="el-image-viewer__img"
            :class="previewImageClass"
            :key="'img-' + index"
            :src="currentItem.src"
            :style="mergedImgStyle"
            referrerpolicy="no-referrer"
            @load="handleImgLoad"
            @error="handleImgError"
            @mousedown="handleMouseDown"
          />
          <div v-else class="el-image-viewer__unknown">
            {{ unknownText }}
          </div>
        </template>
      </div>
    </div>
  </transition>
</template>

<script>
import { on, off } from "../src/utils/dom.js";
import { rafThrottle, isFirefox } from "../src/utils/util.js";
import { PopupManager } from "../src/utils/popup";
import Locale from "../src/mixins/locale.js";
import {
  inferPreviewKind,
  PREVIEW_KIND,
  imageMimeFromMagic,
} from "../src/utils/preview-kind.js";
import { renderPdfPagesToBlobUrls } from "../src/utils/pdf-render.js";

const Mode = {
  CONTAIN: {
    name: "contain",
    icon: "el-icon-full-screen",
  },
  ORIGINAL: {
    name: "original",
    icon: "el-icon-c-scale-to-original",
  },
};

const mousewheelEventName = isFirefox() ? "DOMMouseScroll" : "mousewheel";

export default {
  name: "lztElImageViewer",

  mixins: [Locale],

  props: {
    urlList: {
      type: Array,
      default: () => [],
    },
    /** 与 urlList 下标对齐，取 'image' | 'pdf'；无法从流/链接推断时必须传入 */
    previewTypes: {
      type: Array,
      default: () => [],
    },
    zIndex: {
      type: Number,
      default: 2000,
    },
    onSwitch: {
      type: Function,
      default: () => {},
    },
    onClose: {
      type: Function,
      default: () => {},
    },
    initialIndex: {
      type: Number,
      default: 0,
    },
    appendToBody: {
      type: Boolean,
      default: true,
    },
    maskClosable: {
      type: Boolean,
      default: true,
    },
    /** 为 true 时首尾循环；为 false 时在第一页禁止上一张、最后一页禁止下一张（适合多页 PDF） */
    infinite: {
      type: Boolean,
      default: false,
    },
    /** 遮罩层额外 class（与主题类名并存） */
    previewMaskClass: {
      type: [String, Array, Object],
      default: null,
    },
    /** 遮罩层额外 style（字符串或对象） */
    previewMaskStyle: {
      type: [String, Object],
      default: null,
    },
    /** 预览大图额外 class（与 el-image-viewer__img 并存） */
    previewImageClass: {
      type: [String, Array, Object],
      default: null,
    },
    /**
     * 预览大图额外 style。内部仍会写入 transform / transition 等用于缩放拖拽；
     * 同名字段以组件内部为准，建议只写边框、圆角、阴影等装饰样式。
     */
    previewImageStyle: {
      type: [String, Object],
      default: null,
    },
  },

  data() {
    return {
      index: 0,
      loading: false,
      rasterLoading: false,
      mode: Mode.CONTAIN,
      transform: {
        scale: 1,
        deg: 0,
        offsetX: 0,
        offsetY: 0,
        enableTransition: false,
      },
      /** 扁平列表：PDF 多页展开为多张图片 */
      flatItems: [],
      /** 勿用 _ 前缀：Vue2 不代理 data 中以 _/$ 开头的键，this._foo 会为 undefined */
      revokeUrlList: [],
      rebuildSeq: 0,
    };
  },
  computed: {
    isSingle() {
      return this.flatItems.length <= 1;
    },
    isFirst() {
      return this.index === 0;
    },
    isLast() {
      return this.index >= this.flatItems.length - 1;
    },
    currentItem() {
      return (
        this.flatItems[this.index] || {
          kind: PREVIEW_KIND.UNKNOWN,
          src: "",
        }
      );
    },
    currentKind() {
      return this.currentItem.kind;
    },
    unknownText() {
      const m = this.currentItem.message;
      if (m) return m;
      return this.t("el.image.previewTypeUnknown");
    },
    imgStyle() {
      const { scale, deg, offsetX, offsetY, enableTransition } = this.transform;
      const style = {
        transform: `scale(${scale}) rotate(${deg}deg)`,
        transition: enableTransition ? "transform .3s" : "",
        "margin-left": `${offsetX}px`,
        "margin-top": `${offsetY}px`,
      };
      if (this.mode === Mode.CONTAIN) {
        style.maxWidth = style.maxHeight = "100%";
      }
      return style;
    },
    /** 用户自定义样式 + 内部 transform，后者覆盖同名键以免破坏缩放 */
    mergedImgStyle() {
      const internal = this.imgStyle;
      const extra = this.previewImageStyle;
      if (extra == null) return internal;
      if (typeof extra === "string") {
        return [internal, extra];
      }
      return Object.assign({}, extra, internal);
    },
    viewerZIndex() {
      const nextZIndex = PopupManager.nextZIndex();
      return this.zIndex > nextZIndex ? this.zIndex : nextZIndex;
    },
  },
  watch: {
    urlList: {
      deep: true,
      immediate: true,
      handler() {
        this.rebuildFlatItems();
      },
    },
    previewTypes: {
      deep: true,
      handler() {
        this.rebuildFlatItems();
      },
    },
    initialIndex() {
      this.rebuildFlatItems();
    },
    index: {
      handler: function (val) {
        this.reset();
        this.onSwitch(val);
      },
    },
    currentItem() {
      this.$nextTick(() => {
        const $img = this.$refs.img;
        if ($img && !$img.complete) {
          this.loading = true;
        }
      });
    },
  },
  methods: {
    async rebuildFlatItems() {
      const seq = ++this.rebuildSeq;
      this.revokeBlobUrls();
      this.rasterLoading = true;
      this.loading = true;

      const list = this.urlList || [];
      const hints = this.previewTypes || [];
      const flat = [];
      const spans = [];

      const rawIdx = Number(this.initialIndex);
      const startIdx = Number.isFinite(rawIdx) && rawIdx >= 0 ? rawIdx : 0;
      const targetListIdx = Math.min(startIdx, Math.max(0, list.length - 1));

      try {
        for (let i = 0; i < list.length; i++) {
          if (seq !== this.rebuildSeq) return;

          const item = list[i];
          let hint = hints[i];
          if (hint !== "image" && hint !== "pdf") hint = null;
          let kind = hint || inferPreviewKind(item);

          if (kind !== PREVIEW_KIND.IMAGE && kind !== PREVIEW_KIND.PDF) {
            console.error(
              "[lzt-element-image-preview] 无法识别预览项类型（索引 " +
                i +
                '）。请为 preview-types 传入 "image" 或 "pdf"，或为该项设置 { type: "pdf"|"image" }。'
            );
            flat.push({
              kind: PREVIEW_KIND.UNKNOWN,
              src: "",
              key: "u-" + i,
            });
            spans.push(1);
            continue;
          }

          if (kind === PREVIEW_KIND.IMAGE) {
            const src = this.createDisplaySrc(item);
            flat.push({
              kind: PREVIEW_KIND.IMAGE,
              src,
              key: "img-" + i,
            });
            spans.push(1);
            continue;
          }

          /* PDF → 多页 PNG */
          try {
            const urls = await renderPdfPagesToBlobUrls(item, this.revokeUrlList, {
              scale: 1.35,
              timeoutMs: 180000,
            });
            if (seq !== this.rebuildSeq) return;
            if (!urls.length) {
              flat.push({
                kind: PREVIEW_KIND.UNKNOWN,
                src: "",
                key: "pdf-empty-" + i,
                message: this.t("el.image.pdfRenderFail"),
              });
              spans.push(1);
            } else {
              urls.forEach((src, pi) => {
                flat.push({
                  kind: PREVIEW_KIND.IMAGE,
                  src,
                  key: "pdf-" + i + "-" + pi,
                });
              });
              spans.push(urls.length);
            }
          } catch (err) {
            if (seq !== this.rebuildSeq) return;
            console.error("[lzt-element-image-preview] PDF 栅格化失败", err);
            flat.push({
              kind: PREVIEW_KIND.UNKNOWN,
              src: "",
              key: "pdf-err-" + i,
              message:
                this.t("el.image.pdfRenderFail") +
                (err && err.message ? " (" + err.message + ")" : ""),
            });
            spans.push(1);
          }
        }

        if (seq !== this.rebuildSeq) return;

        this.flatItems = flat;

        let flatStart = 0;
        for (let j = 0; j < targetListIdx; j++) {
          flatStart += spans[j] || 0;
        }
        this.index = Math.min(flatStart, Math.max(0, flat.length - 1));

        this.$nextTick(() => this.syncLoadingState());
      } catch (e) {
        if (seq === this.rebuildSeq) {
          console.error(e);
        }
      } finally {
        if (seq === this.rebuildSeq) {
          this.rasterLoading = false;
          this.$nextTick(() => this.syncLoadingState());
        }
      }
    },
    createDisplaySrc(rawEntry) {
      let entry = rawEntry;
      if (
        entry &&
        typeof entry === "object" &&
        !(entry instanceof Blob) &&
        !(entry instanceof ArrayBuffer) &&
        !ArrayBuffer.isView(entry)
      ) {
        if (entry.src != null) entry = entry.src;
        else if (entry.url != null) entry = entry.url;
        else if (entry.blob != null) entry = entry.blob;
      }
      if (entry == null) return "";
      if (typeof entry === "string") return entry;
      if (entry instanceof Blob) {
        const b = entry;
        const u = URL.createObjectURL(b);
        this.revokeUrlList.push(u);
        return u;
      }
      if (entry instanceof ArrayBuffer || ArrayBuffer.isView(entry)) {
        const ab =
          entry instanceof ArrayBuffer
            ? entry
            : entry.buffer.slice(entry.byteOffset, entry.byteOffset + entry.byteLength);
        const mime = imageMimeFromMagic(ab);
        const blob = new Blob([ab], { type: mime });
        const u = URL.createObjectURL(blob);
        this.revokeUrlList.push(u);
        return u;
      }
      return "";
    },
    revokeBlobUrls() {
      (this.revokeUrlList || []).forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch (e) {
          /* noop */
        }
      });
      this.revokeUrlList = [];
    },
    syncLoadingState() {
      if (this.rasterLoading) return;
      if (this.currentKind === "image") {
        const $img = this.$refs.img;
        if ($img && !$img.complete) this.loading = true;
        else this.loading = false;
      } else {
        this.loading = false;
      }
    },
    hide() {
      this.deviceSupportUninstall();
      this.onClose();
    },
    deviceSupportInstall() {
      this._keyDownHandler = (e) => {
        e.stopPropagation();
        const keyCode = e.keyCode;
        switch (keyCode) {
          case 27:
            this.hide();
            break;
          case 32:
            this.toggleMode();
            break;
          case 37:
            this.prev();
            break;
          case 38:
            this.handleActions("zoomIn");
            break;
          case 39:
            this.next();
            break;
          case 40:
            this.handleActions("zoomOut");
            break;
        }
      };
      this._mouseWheelHandler = rafThrottle((e) => {
        const delta = e.wheelDelta ? e.wheelDelta : -e.detail;
        if (delta > 0) {
          this.handleActions("zoomIn", {
            zoomRate: 0.015,
            enableTransition: false,
          });
        } else {
          this.handleActions("zoomOut", {
            zoomRate: 0.015,
            enableTransition: false,
          });
        }
      });
      on(document, "keydown", this._keyDownHandler);
      on(document, mousewheelEventName, this._mouseWheelHandler);
    },
    deviceSupportUninstall() {
      off(document, "keydown", this._keyDownHandler);
      off(document, mousewheelEventName, this._mouseWheelHandler);
      this._keyDownHandler = null;
      this._mouseWheelHandler = null;
    },
    handleImgLoad() {
      this.loading = false;
    },
    handleImgError(e) {
      this.loading = false;
      e.target.alt = "加载失败";
    },
    handleMouseDown(e) {
      if (this.currentKind !== "image" || this.loading || e.button !== 0) return;

      const { offsetX, offsetY } = this.transform;
      const startX = e.pageX;
      const startY = e.pageY;
      this._dragHandler = rafThrottle((ev) => {
        this.transform.offsetX = offsetX + ev.pageX - startX;
        this.transform.offsetY = offsetY + ev.pageY - startY;
      });
      on(document, "mousemove", this._dragHandler);
      on(document, "mouseup", () => {
        off(document, "mousemove", this._dragHandler);
      });

      e.preventDefault();
    },
    handleMaskClick() {
      if (this.maskClosable) {
        this.hide();
      }
    },
    reset() {
      this.transform = {
        scale: 1,
        deg: 0,
        offsetX: 0,
        offsetY: 0,
        enableTransition: false,
      };
    },
    toggleMode() {
      if (this.currentKind !== "image" || this.loading || this.rasterLoading) return;

      const modeNames = Object.keys(Mode);
      const modeValues = Object.values(Mode);
      const idx = modeValues.indexOf(this.mode);
      const nextIndex = (idx + 1) % modeNames.length;
      this.mode = Mode[modeNames[nextIndex]];
      this.reset();
    },
    prev() {
      const len = this.flatItems.length;
      if (!len) return;
      if (this.infinite) {
        this.index = (this.index - 1 + len) % len;
        return;
      }
      if (this.isFirst) return;
      this.index = this.index - 1;
    },
    next() {
      const len = this.flatItems.length;
      if (!len) return;
      if (this.infinite) {
        this.index = (this.index + 1) % len;
        return;
      }
      if (this.isLast) return;
      this.index = this.index + 1;
    },
    handleActions(action, options = {}) {
      if (this.currentKind !== "image" || this.loading || this.rasterLoading) return;
      const { zoomRate, rotateDeg, enableTransition } = {
        zoomRate: 0.2,
        rotateDeg: 90,
        enableTransition: true,
        ...options,
      };
      const { transform } = this;
      switch (action) {
        case "zoomOut":
          if (transform.scale > 0.2) {
            transform.scale = parseFloat((transform.scale - zoomRate).toFixed(3));
          }
          break;
        case "zoomIn":
          transform.scale = parseFloat((transform.scale + zoomRate).toFixed(3));
          break;
        case "clocelise":
          transform.deg += rotateDeg;
          break;
        case "anticlocelise":
          transform.deg -= rotateDeg;
          break;
      }
      transform.enableTransition = enableTransition;
    },
  },
  mounted() {
    this.deviceSupportInstall();
    if (this.appendToBody) {
      document.body.appendChild(this.$el);
    }
    this.$refs["el-image-viewer__wrapper"].focus();
  },
  destroyed() {
    this.revokeBlobUrls();
    if (this.appendToBody && this.$el && this.$el.parentNode) {
      this.$el.parentNode.removeChild(this.$el);
    }
  },
};
</script>

<style>
/* 遮罩 / 画布 / 按钮：主题里 btn 与 canvas 同为 z-index:1 且 canvas 在 DOM 后，会盖住关闭与箭头 */
.el-image-viewer__mask {
  z-index: 0;
}
.el-image-viewer__canvas {
  position: relative;
  z-index: 1;
}
.el-image-viewer__btn {
  z-index: 2;
}
.el-image-viewer__raster-loading {
  position: relative;
  z-index: 1;
  color: #fff;
  font-size: 14px;
  padding: 24px;
  text-align: center;
}
.el-image-viewer__unknown {
  position: relative;
  z-index: 1;
  color: #fff;
  padding: 24px;
  max-width: 480px;
  text-align: center;
  line-height: 1.6;
  font-size: 14px;
}
</style>
