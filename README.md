# image-preview

## 基于 vue2 兼容老项目 Element UI 图片预览插件

> 主要是给老项目，尤其是 2.11 以前的项目，没有图片预览提供的插件

> 前还在测试阶段，一边学习一边处理，已经可以支持图片预览。

### 下载

```npm
npm i lzt-element-image-preview
npm i element-theme-chalk -S
```

### 导入

```javascript
// main.js
import imagePreview from "lzt-element-image-preview"; // 导入插件
import "element-theme-chalk"; // 导入样式文件，主要是 Element ui 的icon库
console.log(imagePreview);
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
