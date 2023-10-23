import ImagePreview from "./image-preview/main";
import "./src/css/theme-chalk/src/index.css"

const components = [ImagePreview];

const install = function (Vue) {
    components.forEach(com => {
        Vue.component(com.name,com)
    })
};

if (typeof window !== undefined && window.Vue) {
    install(window.Vue)
}

export default {
    install
}