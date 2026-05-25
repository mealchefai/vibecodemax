import {
  defineConfig
} from "./chunk-62GFTMDR.mjs";
import "./chunk-DPUW62IF.mjs";
import "./chunk-6QBBEOUN.mjs";
import "./chunk-MH2JEEC2.mjs";
import "./chunk-Q7CCAEH6.mjs";
import {
  init_esm
} from "./chunk-SOPMFPK3.mjs";

// trigger.config.ts
init_esm();
var trigger_config_default = defineConfig({
  project: process.env.TRIGGER_PROJECT_REF || "proj_xxxxx",
  dirs: ["./trigger"],
  maxDuration: 300,
  build: {}
});
var resolveEnvVars = void 0;
export {
  trigger_config_default as default,
  resolveEnvVars
};
//# sourceMappingURL=trigger.config.mjs.map
