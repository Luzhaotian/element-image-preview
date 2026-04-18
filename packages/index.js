import ImagePreview from "./image-preview/main";

// 样式不随 JS 打包；请按 README 引入 theme-chalk 中的 image 相关样式。

const components = [ImagePreview];

const install = function (Vue) {
  components.forEach((com) => {
    Vue.component(com.name, com);
  });
};

if (typeof window !== "undefined" && window.Vue) {
  install(window.Vue);
}

export default {
  install,
};
