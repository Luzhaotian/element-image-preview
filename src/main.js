import Vue from "vue";
import App from "./App.vue";
// 与 npm 包同一入口，避免演示与 dist 行为不一致
import imagePreview from "../packages/index.js";
import "@/css/theme-chalk/src/index.scss";

Vue.use(imagePreview);

Vue.config.productionTip = false;

new Vue({
  render: (h) => h(App),
}).$mount("#app");

export { imagePreview };
