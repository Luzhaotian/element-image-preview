const { defineConfig } = require("@vue/cli-service");

const path = require("path");

module.exports = defineConfig({
  transpileDependencies: true,
  lintOnSave: false,
  /** 本地与 npm 库构建默认 `/`；GitHub Pages 在 CI 中设置 `VUE_PUBLIC_PATH=/仓库名/` */
  publicPath: process.env.VUE_PUBLIC_PATH || "/",
  css: {
    extract: false,
  },
  pages: {
    index: {
      // 修改项目入口文件
      entry: "src/main.js",
      template: "public/index.html",
      filename: "index.html",
    },
  },
  // 扩展webpack配置,使webpages加入编译
  chainWebpack: (config) => {
    config.module
      .rule("js")
      .include.add(path.resolve(__dirname, "packages"))
      .end()
      .use("babel")
      .loader("babel-loader")
      .tap((options) => {
        return options;
      });
  },
});
