<template>
  <div class="el-image">
    <slot v-if="loading" name="placeholder">
      <div class="el-image__placeholder"></div>
    </slot>
    <slot v-else-if="error" name="error">
      <div class="el-image__error">{{ t("el.image.error") }}</div>
    </slot>
    <img
      v-else
      class="el-image__inner"
      v-bind="$attrs"
      v-on="$listeners"
      @click="clickHandler"
      :src="src"
      :style="imageStyle"
      :class="{
        'el-image__inner--center': alignCenter,
        'el-image__preview': preview,
      }"
    />
    <template v-if="preview">
      <image-viewer
        :z-index="zIndex"
        :initial-index="imageIndex"
        v-if="showViewer"
        :on-close="closeViewer"
        :url-list="previewSrcList"
        :preview-types="previewTypes"
        :infinite="infinite"
      />
    </template>
  </div>
</template>

<script>
import ImageViewer from "./image-viewer";
import Locale from "../src/mixins/locale.js";
import {
  on,
  off,
  getScrollContainer,
  isInContainer,
} from "../src/utils/dom.js";
import { isString, isHtmlElement } from "../src/utils/types.js";
import throttle from "throttle-debounce/throttle";

const isSupportObjectFit = () =>
  document.documentElement.style.objectFit !== undefined;

const ObjectFit = {
  NONE: "none",
  CONTAIN: "contain",
  COVER: "cover",
  FILL: "fill",
  SCALE_DOWN: "scale-down",
};

let prevOverflow = "";

export default {
  name: "lztElImage",

  mixins: [Locale],
  inheritAttrs: false,

  components: {
    ImageViewer,
  },

  props: {
    src: String,
    fit: String,
    lazy: Boolean,
    scrollContainer: {},
    previewSrcList: {
      type: Array,
      default: () => [],
    },
    zIndex: {
      type: Number,
      default: 2000,
    },
    initialIndex: Number,
    /** 与 preview-src-list 一一对应：'image' | 'pdf'；无扩展名/无 MIME 的文件流建议必传 */
    previewTypes: {
      type: Array,
      default: () => [],
    },
    /** 预览是否首尾循环；默认 false，第一页不能上一张、最后一页不能下一张 */
    infinite: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      loading: true,
      error: false,
      show: !this.lazy,
      imageWidth: 0,
      imageHeight: 0,
      showViewer: false,
    };
  },

  computed: {
    imageStyle() {
      const { fit } = this;
      if (!this.$isServer && fit) {
        return isSupportObjectFit()
          ? { "object-fit": fit }
          : this.getImageStyle(fit);
      }
      return {};
    },
    alignCenter() {
      return (
        !this.$isServer && !isSupportObjectFit() && this.fit !== ObjectFit.FILL
      );
    },
    preview() {
      const { previewSrcList } = this;
      return Array.isArray(previewSrcList) && previewSrcList.length > 0;
    },
    imageIndex() {
      const list = this.previewSrcList || [];
      const len = list.length;
      if (!len) return 0;
      const initialIndex = this.initialIndex;
      if (
        typeof initialIndex === "number" &&
        !Number.isNaN(initialIndex) &&
        initialIndex >= 0
      ) {
        return Math.min(initialIndex, len - 1);
      }
      const srcIndex = list.indexOf(this.src);
      if (srcIndex >= 0) return srcIndex;
      return 0;
    },
  },

  watch: {
    src() {
      this.show && this.loadImage();
    },
    show(val) {
      val && this.loadImage();
    },
  },

  mounted() {
    if (this.lazy) {
      this.addLazyLoadListener();
    } else {
      this.loadImage();
    }
  },

  beforeDestroy() {
    this.lazy && this.removeLazyLoadListener();
  },

  methods: {
    loadImage() {
      if (this.$isServer) return;

      // reset status
      this.loading = true;
      this.error = false;

      const img = new Image();
      img.onload = (e) => this.handleLoad(e, img);
      img.onerror = this.handleError.bind(this);

      // bind html attrs
      // so it can behave consistently
      Object.keys(this.$attrs).forEach((key) => {
        const value = this.$attrs[key];
        img.setAttribute(key, value);
      });
      img.src = this.src;
    },
    handleLoad(e, img) {
      this.imageWidth = img.width;
      this.imageHeight = img.height;
      this.loading = false;
      this.error = false;
    },
    handleError(e) {
      this.loading = false;
      this.error = true;
      this.$emit("error", e);
    },
    handleLazyLoad() {
      if (isInContainer(this.$el, this._scrollContainer)) {
        this.show = true;
        this.removeLazyLoadListener();
      }
    },
    addLazyLoadListener() {
      if (this.$isServer) return;

      const { scrollContainer } = this;
      let _scrollContainer = null;

      if (isHtmlElement(scrollContainer)) {
        _scrollContainer = scrollContainer;
      } else if (isString(scrollContainer)) {
        _scrollContainer = document.querySelector(scrollContainer);
      } else {
        _scrollContainer = getScrollContainer(this.$el);
      }

      if (_scrollContainer) {
        this._scrollContainer = _scrollContainer;
        this._lazyLoadHandler = throttle(200, this.handleLazyLoad);
        on(_scrollContainer, "scroll", this._lazyLoadHandler);
        this.handleLazyLoad();
      }
    },
    removeLazyLoadListener() {
      const { _scrollContainer, _lazyLoadHandler } = this;

      if (this.$isServer || !_scrollContainer || !_lazyLoadHandler) return;

      off(_scrollContainer, "scroll", _lazyLoadHandler);
      this._scrollContainer = null;
      this._lazyLoadHandler = null;
    },
    /**
     * simulate object-fit behavior to compatible with IE11 and other browsers which not support object-fit
     */
    getImageStyle(fit) {
      const { imageWidth, imageHeight } = this;
      const { clientWidth: containerWidth, clientHeight: containerHeight } =
        this.$el;

      if (!imageWidth || !imageHeight || !containerWidth || !containerHeight)
        return {};

      const imageAspectRatio = imageWidth / imageHeight;
      const containerAspectRatio = containerWidth / containerHeight;

      if (fit === ObjectFit.SCALE_DOWN) {
        const isSmaller =
          imageWidth < containerWidth && imageHeight < containerHeight;
        fit = isSmaller ? ObjectFit.NONE : ObjectFit.CONTAIN;
      }

      switch (fit) {
        case ObjectFit.NONE:
          return { width: "auto", height: "auto" };
        case ObjectFit.CONTAIN:
          return imageAspectRatio < containerAspectRatio
            ? { width: "auto" }
            : { height: "auto" };
        case ObjectFit.COVER:
          return imageAspectRatio < containerAspectRatio
            ? { height: "auto" }
            : { width: "auto" };
        default:
          return {};
      }
    },
    clickHandler() {
      // don't show viewer when preview is false
      if (!this.preview) {
        return;
      }
      // prevent body scroll
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      this.showViewer = true;
    },
    closeViewer() {
      document.body.style.overflow = prevOverflow;
      this.showViewer = false;
    },
  },
};
</script>
