<template>
  <div id="app">
    <!-- <img alt="Vue logo" src="./assets/logo.png">
    <HelloWorld msg="Welcome to Your Vue.js App"/> -->
    <button @click="btnClick">点击预览</button>
    <lztElImage
      ref="lztElImageRef"
      src="https://fuss10.elemecdn.com/8/27/f01c15bb73e1ef3793e64e6b7bbccjpeg.jpeg"
      style="width: 100px; height: 100px"
      :preview-src-list="[
        'https://fuss10.elemecdn.com/8/27/f01c15bb73e1ef3793e64e6b7bbccjpeg.jpeg',
        'https://fuss10.elemecdn.com/1/8e/aeffeb4de74e2fde4bd74fc7b4486jpeg.jpeg',
      ]"
    />
    <!-- <iframe src="https://webd.uc.bmw.com.cn/ucpr-front//pdf.js-gh-pages/web/viewer.html?file=blob%3Ahttps%3A%2F%2Fwebd.uc.bmw.com.cn%2F58b45fe5-784f-4441-9e3f-3624d382f14f" frameborder="0"></iframe> -->
  </div>
</template>

<script>
// import imageViewer from "./views/image-preview/src/image-viewer.vue";
// import HelloWorld from './components/HelloWorld.vue'

export default {
  name: "App",
  components: {
    // HelloWorld
    // imageViewer,
  },
  data() {
    return {
      iframeSrc: "",
    };
  },
  //
  methods: {
    btnClick() {
      console.log("点击了");
      const str =
        "blob:https://webd.uc.bmw.com.cn/1e54c1eb-1d3a-4f6e-9103-6135f1045001";
      // console.log(str);
      this.iframeSrc = str;

      // this.$refs.lztElImageRef.showViewer = true;
    },
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
