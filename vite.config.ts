import { fileURLToPath, URL } from "node:url";
import VueI18nPlugin from "@intlify/unplugin-vue-i18n/vite";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import ViteYaml from "@modyfi/vite-plugin-yaml";
import path from "path";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  let publicPath = "/";

  switch (env.VITE_NODE_ENV) {
    case "staging":
      publicPath = "/web-wallet-vuejs";
      break;
    case "production":
      publicPath = "";
      break;
    case "development":
      publicPath = "/";
      break;
  }
  return {
    define: {
      BUILD_YEAR :new Date().getFullYear()
    },
    base: publicPath,
    plugins: [
      //experimental features
      vue({
        script:{
          defineModel:true,
          propsDestructure: true
        }
      }),
      VueI18nPlugin({
        include: path.resolve(__dirname, "./src/assets/locales/**"),
      }),
      ViteYaml(),
      nodePolyfills({
        // Whether to polyfill `node:` protocol imports.
        protocolImports: true,
      }),
    ],
    resolve: {
      alias: {
        vue: "vue/dist/vue.esm-bundler.js",
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (
                id.includes("tsjs-xpx-chain-sdk") ||
                id.includes("@js-joda") ||
                id.includes("decimal.js") ||
                id.includes("bn.js")
              ) {
                return "vendor-sirius-sdk";
              }
              if (
                id.includes("mathjs") ||
                id.includes("typed-function") ||
                id.includes("complex.js") ||
                id.includes("fraction.js")
              ) {
                return "vendor-math";
              }
              if (id.includes("ethers") || id.includes("@noble")) {
                return "vendor-ethers";
              }
              if (id.includes("primevue") || id.includes("@fortawesome")) {
                return "vendor-ui";
              }
              if (
                id.includes("vue-router") ||
                id.includes("vue-i18n") ||
                id.includes("@intlify") ||
                id.includes("/vue/") ||
                id.includes("/@vue/")
              ) {
                return "vendor-vue";
              }
              if (
                id.includes("crypto-js") ||
                id.includes("jose") ||
                id.includes("dompurify") ||
                id.includes("buffer")
              ) {
                return "vendor-crypto";
              }
            }
          },
        },
      },
    },
  };
});
