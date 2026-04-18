# image-preview

NPM 包：<https://www.npmjs.com/package/lzt-element-image-preview>

源码与问题反馈：<https://github.com/Luzhaotian/element-image-preview/issues>

## 基于 vue2 兼容老项目 Element UI 图片预览插件

> 主要是给老项目，尤其是 2.11 以前的项目，没有图片预览提供的插件

> 前还在测试阶段，一边学习一边处理，已经可以支持图片预览。

### 下载

```npm
npm i lzt-element-image-preview
npm i element-theme-chalk -S
```

### 本地开发

克隆仓库后执行 `npm install`、`npm run serve`。演示应用从 **`packages/index.js`** 注册组件，与 **`npm run lib`** 打出来的 npm 包为**同一份源码**，避免演示与发布不一致。

`npm install` 会通过 **husky** 安装 Git 钩子：**`pre-commit`** 会对暂存的 `*.js` / `*.vue` 跑 **ESLint**（`lint-staged`）。全量检查可执行 `npm run lint`。

### 导入

自 v1.3.0 起，**不再把整份 Element 主题打进 JS**，请务必备好样式（与此前 README 推荐方式一致），否则图标与布局会异常。

如果使用旧版 使用版本 1.2.0 以下版本

```javascript
// main.js
import Vue from "vue";
import imagePreview from "lzt-element-image-preview";
import "element-theme-chalk"; // 图标字体 + 组件样式（必装）
Vue.use(imagePreview);
```

### 使用

```html
<lzt-el-image
  src="https://fuss10.elemecdn.com/8/27/f01c15bb73e1ef3793e64e6b7bbccjpeg.jpeg"
  style="width: 100px; height: 100px"
  :preview-src-list="[
    'https://fuss10.elemecdn.com/8/27/f01c15bb73e1ef3793e64e6b7bbccjpeg.jpeg',
    'https://fuss10.elemecdn.com/1/8e/aeffeb4de74e2fde4bd74fc7b4486jpeg.jpeg',
]"
>
</lzt-el-image>
```

### Issues

> 目前插件还在测试，想法是支持 PDF 计划在 2 版本以后开始支持 PDF 预览

### Customize configuration

See [Configuration Reference](https://cli.vuejs.org/config/).
