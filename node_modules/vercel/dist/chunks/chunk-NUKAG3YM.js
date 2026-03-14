import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirname_ } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname_(__filename);
import {
  require_lib
} from "./chunk-QXRJ52T4.js";
import {
  init_pkg,
  pkg_default
} from "./chunk-3XFFP2BA.js";
import {
  output_manager_default
} from "./chunk-FDJURQMQ.js";
import {
  __toESM
} from "./chunk-TZ2YI2VH.js";

// src/commands/build/emit-flags-datafiles.ts
var import_node_fetch = __toESM(require_lib(), 1);
import { createHash } from "crypto";
import { NowBuildError } from "@vercel/build-utils";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
init_pkg();
var FLAGS_HOST = "https://flags.vercel.com";
var FLAGS_DEFINITIONS_VERSION = "1.0.1";
function obfuscate(sdkKey, prefixLength = 18) {
  if (prefixLength >= sdkKey.length)
    return sdkKey;
  return sdkKey.slice(0, prefixLength) + "*".repeat(sdkKey.length - prefixLength);
}
function hashSdkKey(sdkKey) {
  return createHash("sha256").update(sdkKey).digest("hex");
}
function generateDefinitionsModule(sdkKeys, values) {
  const stringified = sdkKeys.map((_, i) => JSON.stringify(values[i]));
  const uniqueStrings = [];
  const stringToIndex = /* @__PURE__ */ new Map();
  for (const s of stringified) {
    if (!stringToIndex.has(s)) {
      stringToIndex.set(s, uniqueStrings.length);
      uniqueStrings.push(s);
    }
  }
  const keyToIndex = sdkKeys.map((_, i) => stringToIndex.get(stringified[i]));
  const hashedKeys = sdkKeys.map(hashSdkKey);
  const lines = [
    "const memo = (fn) => { let cached; return () => (cached ??= fn()); };",
    ""
  ];
  for (let i = 0; i < uniqueStrings.length; i++) {
    lines.push(
      `const _d${i} = memo(() => JSON.parse(${JSON.stringify(uniqueStrings[i])}));`
    );
  }
  lines.push("");
  lines.push("const map = {");
  for (let i = 0; i < sdkKeys.length; i++) {
    lines.push(`  ${JSON.stringify(hashedKeys[i])}: _d${keyToIndex[i]},`);
  }
  lines.push("};");
  lines.push("");
  lines.push("export function get(hashedSdkKey) {");
  lines.push("  return map[hashedSdkKey]?.() ?? null;");
  lines.push("}");
  lines.push("");
  lines.push(
    `export const version = ${JSON.stringify(FLAGS_DEFINITIONS_VERSION)};`
  );
  return lines.join("\n");
}
async function emitFlagsDatafiles(cwd, env) {
  output_manager_default.debug("vercel-flags: checking env vars for SDK Keys");
  const sdkKeys = Array.from(
    Object.values(env).reduce((acc, value) => {
      if (typeof value === "string") {
        if (value.startsWith("vf_")) {
          acc.add(value);
        } else if (value.startsWith("flags:")) {
          const params = new URLSearchParams(value.slice("flags:".length));
          const sdkKey = params.get("sdkKey");
          if (sdkKey?.startsWith("vf_")) {
            acc.add(sdkKey);
          }
        }
      }
      return acc;
    }, /* @__PURE__ */ new Set())
  );
  output_manager_default.debug(`vercel-flags: found ${sdkKeys.length} SDK keys`);
  const fetchPromise = Promise.all(
    sdkKeys.map(async (sdkKey) => {
      const headers = {
        authorization: `Bearer ${sdkKey}`,
        "user-agent": `VercelCLI/${pkg_default.version}`
      };
      if (env.VERCEL_PROJECT_ID) {
        headers["x-vercel-project-id"] = env.VERCEL_PROJECT_ID;
      }
      if (env.VERCEL_ENV) {
        headers["x-vercel-env"] = env.VERCEL_ENV;
      }
      if (env.VERCEL_DEPLOYMENT_ID) {
        headers["x-vercel-deployment-id"] = env.VERCEL_DEPLOYMENT_ID;
      }
      if (env.VERCEL_REGION) {
        headers["x-vercel-region"] = env.VERCEL_REGION;
      }
      const res = await (0, import_node_fetch.default)(`${FLAGS_HOST}/v1/datafile`, { headers });
      if (!res.ok) {
        throw new NowBuildError({
          code: "VERCEL_FLAGS_DEFINITIONS_FETCH_FAILED",
          message: `Failed to fetch flag definitions for ${obfuscate(sdkKey)}: ${res.status} ${res.statusText}`,
          link: "https://vercel.com/docs/flags"
          // TODO replace with better link once we have a docs page
        });
      }
      return res.json();
    })
  );
  const values = await output_manager_default.time(
    "vercel-flags: load datafiles",
    fetchPromise
  );
  const definitionsJs = generateDefinitionsModule(sdkKeys, values);
  const storageDir = join(cwd, "node_modules", "@vercel", "flags-definitions");
  const indexPath = join(storageDir, "index.js");
  const dtsPath = join(storageDir, "index.d.ts");
  const packageJsonPath = join(storageDir, "package.json");
  const dts = [
    "export function get(hashedSdkKey: string): Record<string, unknown> | null;",
    "export const version: string;",
    ""
  ].join("\n");
  const packageJson = {
    name: "@vercel/flags-definitions",
    version: FLAGS_DEFINITIONS_VERSION,
    type: "module",
    main: "./index.js",
    types: "./index.d.ts",
    exports: {
      ".": {
        types: "./index.d.ts",
        import: "./index.js"
      }
    }
  };
  await mkdir(storageDir, { recursive: true });
  await Promise.all([
    writeFile(indexPath, definitionsJs),
    writeFile(dtsPath, dts),
    writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2))
  ]);
  output_manager_default.debug("vercel-flags: created module");
  output_manager_default.debug(`  \u2192 ${indexPath}`);
  output_manager_default.debug(`  \u2192 ${dtsPath}`);
  output_manager_default.debug(`  \u2192 ${packageJsonPath}`);
  output_manager_default.debug(
    `  \u2192 included definitions for keys "${sdkKeys.map((key) => obfuscate(key)).join(", ")}"`
  );
}

export {
  emitFlagsDatafiles
};
