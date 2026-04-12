import { readFileSync } from "fs";
import { defineConfig } from "vite";

import { assetpackPlugin } from "./scripts/assetpack-vite-plugin";

const rootPkg = JSON.parse(readFileSync("../package.json", "utf-8"));

// https://vite.dev/config/
export default defineConfig({
  plugins: [assetpackPlugin()],
  server: {
    port: 5173,
    open: true,
  },
  define: {
    APP_VERSION: JSON.stringify(rootPkg.version),
  },
});
