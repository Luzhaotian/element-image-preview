# 变更日志

本文件记录 **npm 每次发布**对应的用户可见变更。发新版时请在**顶部**追加新版本区块（保持从新到旧），并同步更新 `package.json` 中的 `version`。

格式说明：

- **新增**：新 API、新能力。
- **变更**：不兼容或默认行为改变。
- **修复**：缺陷修复。
- **文档**：仅 README / 注释等（若与功能无关可略写）。

---

## [2.1.0] - 2026-04-18

### 新增

- `lztElImage` 全屏预览样式入口：`preview-mask-class`、`preview-mask-style`、`preview-image-class`、`preview-image-style`（遮罩与预览大图装饰；大图行内样式与内部 `transform` 合并，内置缩放优先）。

### 文档

- README：补充上述属性的 API 表与示例。

---

## [2.0.0] - 2026-04-18

### 新增

- 预览支持 **PDF**：通过 pdf.js 将 PDF 按页栅格化为图片，与多图预览同一套切换与（图片页）缩放/旋转交互。
- `preview-types`：与 `preview-src-list` 对齐，显式声明 `image` / `pdf`。
- `infinite`：控制预览是否首尾循环，**默认 `false`**（多页 PDF 场景更合适）。
- 本地化文案扩展（含 PDF 栅格化加载提示等）。
- 演示与本地开发：`sync-pdf-worker` 脚本、`public/pdf.worker.min.mjs` 等同源 Worker 支持；README 重写。

### 变更

- 样式不再打入组件 JS，接入方需自行引入 Element 主题中的 **image / image-viewer** 相关样式（与 v1.3+ 说明一致）。
- 移除仓库内未再引用的冗余源码与重复 mixin/views。

### 修复 / 调整

- 预览层与主题样式叠放（z-index）等细节调整，避免控件被画布遮挡。
- `dom` 等工具在 ESLint / 运行时的边界处理。

---

## [1.3.x]

### 变更 / 优化

- **项目与打包优化**：例如样式不再打入组件 JS，减小包体、便于与业务侧 Element 主题版本对齐；接入方需自行引入 `element-theme-chalk`（或等价）中的 **image / image-viewer** 相关样式。

---

## [1.2.x]

### 新增 / 定位

- 面向 **Element UI 2.11 及以前**：官方尚未提供或不稳定提供图片预览能力时，用本组件实现**缩略图 + 全屏图片预览**，在常见老项目中表现**相对稳定**，适合一般业务场景。

---

## 更早版本

更细版本号与迁移说明见 [npm 版本列表](https://www.npmjs.com/package/lzt-element-image-preview?activeTab=versions) 与仓库历史提交；需要时可对照 tag 将差异补进本文件。
