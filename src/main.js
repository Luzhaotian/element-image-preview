import Vue from "vue";
import App from "./App.vue";
import imagePreview from "@/views/image-preview/index.js";
import '@/css/theme-chalk/src/index.scss';

Vue.use(imagePreview);

Vue.config.productionTip = false;

new Vue({
  render: (h) => h(App),
}).$mount("#app");
