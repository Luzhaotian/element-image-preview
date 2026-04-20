# lzt-element-image-preview

基于 **Vue 2** 与 **Element UI** 的 `el-image` 思路封装的图片预览组件，在缩略图与全屏预览中支持**多张图片**与 **PDF（按页栅格化为图片）** 混排切换。

| 项          | 说明                                                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| 包名        | `[lzt-element-image-preview](https://www.npmjs.com/package/lzt-element-image-preview)`                     |
| 在线预览    | [https://luzhaotian.github.io/element-image-preview/](https://luzhaotian.github.io/element-image-preview/) |
| 许可        | MIT                                                                                                        |
| Vue         | `^2.6`（peer）                                                                                             |
| 源码 / 反馈 | [GitHub Issues](https://github.com/Luzhaotian/element-image-preview/issues)                                |

---

## 特性

- **v1.2** 起：针对 **Element UI 2.11 及以前**缺少（或不完善）官方图片预览的场景，提供**相对稳定**的缩略图 + 全屏图片预览，适合一般老项目接入。
- **v1.3** 起：以**项目与打包优化**为主（样式外置等）；与 Element `el-image` 相近的用法：`src`、`fit`、`lazy`、`preview-src-list` 等。
- 预览层支持左右切换、`z-index`、可选 `infinite`（默认不循环首尾）。
- `preview-types`：与 `preview-src-list` 下标对齐，显式声明 `image` / `pdf`（无扩展名、无 MIME 的二进制流建议必传）。
- PDF 使用 **pdf.js** 在客户端渲染为 PNG，与图片共用同一套预览交互（缩放、旋转等仅对图片页展示）。
- 自 **v1.3.0** 起：**样式不打进 JS**，需自行引入 `element-theme-chalk`（或等价）中的 **image / image-viewer** 相关样式，否则图标与布局异常。

---

## 安装

```bash
npm i lzt-element-image-preview
npm i element-ui element-theme-chalk
```

> 若项目已集成 Element UI 与主题包，只需安装本包即可。

---

## 快速接入

```javascript
// main.js
import Vue from "vue";
import ElementUI from "element-ui";
import "element-ui/lib/theme-chalk/index.css"; // 或 element-theme-chalk 等你项目已有的引入方式
import LztImagePreview from "lzt-element-image-preview";

Vue.use(ElementUI);
Vue.use(LztImagePreview);
```

注册后全局组件名为 `**lztElImage**`，模板中写作 `**<lzt-el-image>**`（与 Element 文档中的 kebab-case 一致）。

```vue
<lzt-el-image
  src="https://example.com/thumb.jpg"
  style="width: 120px; height: 120px; cursor: pointer"
  :preview-src-list="['https://example.com/a.jpg', 'https://example.com/b.jpg']"
/>
```

---

## 组件 API（`lztElImage`）

除与 `el-image` 对齐的常用项外，预览相关属性如下。

| 属性                  | 类型                        | 默认值  | 说明                                                                                                                        |
| --------------------- | --------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| `preview-src-list`    | `Array`                     | `[]`    | 预览列表。每项可为字符串 URL、`Blob` / `File` / `ArrayBuffer`，或对象 `{ src / url / blob, type?: 'image' &#124; 'pdf' }`。 |
| `preview-types`       | `Array`                     | `[]`    | 与列表**等长**时按位指定 `'image'` / `'pdf'`；无法从 URL / 魔数推断时建议必传。                                             |
| `initial-index`       | `Number`                    | —       | 打开预览时的起始下标。                                                                                                      |
| `z-index`             | `Number`                    | `2000`  | 预览层 z-index。                                                                                                            |
| `infinite`            | `Boolean`                   | `false` | 是否在首尾循环切换。                                                                                                        |
| `preview-mask-class`  | `String`，`Array`，`Object` | —       | 全屏预览**遮罩层**（`.el-image-viewer__mask`）额外 class，与主题类名叠加。                                                  |
| `preview-mask-style`  | `String`，`Object`          | —       | 遮罩层额外行内样式（如自定义背景色、透明度）。                                                                              |
| `preview-image-class` | `String`，`Array`，`Object` | —       | 预览**大图**（`.el-image-viewer__img`）额外 class。                                                                         |
| `preview-image-style` | `String`，`Object`          | —       | 预览大图额外行内样式。**不要**依赖覆盖 `transform` / `transition`（由组件内部用于缩放、旋转）；适合写圆角、边框、阴影等。   |

### 自定义遮罩与大图样式示例

```vue
<lzt-el-image
  src="https://example.com/thumb.jpg"
  style="width: 120px; height: 120px; cursor: pointer"
  :preview-src-list="['https://example.com/a.jpg']"
  preview-mask-class="my-preview-mask"
  :preview-mask-style="{ background: 'rgba(0,0,0,.75)' }"
  :preview-image-style="{
    borderRadius: '8px',
    boxShadow: '0 8px 32px rgba(0,0,0,.35)',
  }"
/>
```

```css
.my-preview-mask {
  backdrop-filter: blur(2px);
}
```

其余行为（`fit`、`lazy`、`scroll-container` 等）与 Element `el-image` 同类 props 一致，可按需查阅 [Element Image 文档](https://element.eleme.cn/#/zh-CN/component/image)。

---

## PDF 与 Worker

- 包内依赖 **pdfjs-dist**，UMD 构建体积会包含 PDF 能力。
- 运行时默认尝试**同源**加载 Worker：`{应用 origin}{publicPath}pdf.worker.min.mjs`。子路径部署（如 GitHub Pages）会从已加载的 `/js/*.js` 推断 `publicPath`，避免误请求到域名根下的 worker。
- 需要**自定义 Worker 地址**时（网络受限、内网、CDN 与默认不一致）：在应用入口（`new Vue` 之前）设置：
  ```js
  window.__LZT_PDFJS_WORKER__ = "https://你的域名/static/pdf.worker.min.mjs";
  ```
  Worker 需与当前 **pdfjs-dist 大版本** 匹配；可从 `node_modules/pdfjs-dist/build/pdf.worker.min.mjs` 复制，或参考 `scripts/copy-pdf-worker.js` 同步到静态资源目录。
- 远程 PDF 地址需服务端允许 **CORS**，否则无法拉取。
- 调试：控制台执行 `window.__LZT_PDF_DEBUG__ = true` 后刷新，可查看 `[LZT-PDF]` 日志。

---

## 类型推断与 `preview-types` 示例

能推断时（常见图片 / PDF 扩展名、`data:` MIME、部分文件头魔数）可不传 `preview-types`。否则请显式传入：

```vue
<lzt-el-image
  :src="thumb"
  :preview-src-list="[opaqueUrl, fileWithoutExt]"
  :preview-types="['pdf', 'pdf']"
/>
```

---

## 发布产物（npm）

- `**main**`：`dist/lzt-element-image-preview.umd.js`
- `**files**`：仅 `dist/`（含 `umd` / `umd.min` / `common` 等由 `vue-cli-service build --target lib` 生成）

维护者打库：

```bash
npm run lib
```

---

## 本地开发本仓库

```bash
npm install
npm run serve
```

- 演示应用从 `**packages/index.js**` 注册组件，与 `**npm run lib**` 入口一致，避免演示与发布源码分叉。
- `npm run serve` 会先执行 `**npm run sync-pdf-worker**`，将 `pdf.worker.min.mjs` 同步到 `public/`，便于本地 PDF 预览。
- 提交前 **husky + lint-staged** 会对暂存文件执行 **Prettier** 与 **ESLint**；全量检查：`npm run lint`、`npm run format:check`。
- 一键格式化：`npm run format`。编辑器建议安装 [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)（仓库已配置 `.vscode/extensions.json` 推荐）。

---

## GitHub Pages 在线演示

推送至 `main` 分支会通过 [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml) 构建演示站并部署到 GitHub Pages（构建时自动设置 `VUE_PUBLIC_PATH=/<仓库名>/`）。

**首次启用：** 在仓库 **Settings → Pages** 中，将 **Build and deployment** 的 **Source** 选为 **GitHub Actions**（不要再用 `gh-pages` 分支作为来源）。

部署完成后可直接访问本仓库演示：[https://luzhaotian.github.io/element-image-preview/](https://luzhaotian.github.io/element-image-preview/)；若你是 fork 后部署，则地址为 `https://<你的用户名>.github.io/<仓库名>/`。

---

## 版本说明（摘要）

每次发版请在仓库根目录 **[CHANGELOG.md](./CHANGELOG.md)** 顶部补充「本版相对上一版」的条目（与 `package.json` 的 `version` 一致）。

- **v2.1**：`lztElImage` 增加全屏预览样式入口：`preview-mask-class` / `preview-mask-style`、`preview-image-class` / `preview-image-style`（遮罩与大图装饰样式，与内置缩放 transform 兼容合并）。
- **v2.0**：预览默认**非循环**（`infinite` 默认 `false`）；仓库内移除未引用源码；与 PDF 流水线相关的细节见上文。
- **v1.3**：项目与打包优化；**样式外置**，务必引入 Element 主题中的 image 相关样式。
- **v1.2**：支持 Element UI 2.11 及以前环境下的**图片预览**（相对稳定，适合一般场景）。
- 更细版本见 [CHANGELOG.md](./CHANGELOG.md) 与 [npm 版本列表](https://www.npmjs.com/package/lzt-element-image-preview?activeTab=versions)。

---

## 更多配置

Vue CLI 项目通用说明见 [Configuration Reference](https://cli.vuejs.org/config/)。
