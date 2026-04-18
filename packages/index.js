import ImagePreview from "./image-preview/main";

// 样式不随 JS 打包，避免重复整份 Element 主题（见 README：请引入 element-theme-chalk）。

const components = [ImagePreview];

const install = function (Vue) {
    components.forEach(com => {
        Vue.component(com.name,com)
    })
};

if (typeof window !== "undefined" && window.Vue) {
    install(window.Vue)
}

export default {
    install
}