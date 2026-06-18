import { fileURLToPath } from "node:url";

export default {
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
  },
};
