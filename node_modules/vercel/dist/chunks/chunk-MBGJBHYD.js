import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirname_ } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname_(__filename);
import {
  VERCEL_DIR
} from "./chunk-AQLVWVEN.js";
import {
  ConflictingConfigFiles
} from "./chunk-ZLCMHY2G.js";
import {
  output_manager_default
} from "./chunk-FDJURQMQ.js";
import {
  __commonJS,
  __require,
  __toESM
} from "./chunk-TZ2YI2VH.js";

// ../../node_modules/.pnpm/dotenv@4.0.0/node_modules/dotenv/lib/main.js
var require_main = __commonJS({
  "../../node_modules/.pnpm/dotenv@4.0.0/node_modules/dotenv/lib/main.js"(exports, module) {
    "use strict";
    var fs = __require("fs");
    function parse(src) {
      var obj = {};
      src.toString().split("\n").forEach(function(line) {
        var keyValueArr = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
        if (keyValueArr != null) {
          var key = keyValueArr[1];
          var value = keyValueArr[2] ? keyValueArr[2] : "";
          var len = value ? value.length : 0;
          if (len > 0 && value.charAt(0) === '"' && value.charAt(len - 1) === '"') {
            value = value.replace(/\\n/gm, "\n");
          }
          value = value.replace(/(^['"]|['"]$)/g, "").trim();
          obj[key] = value;
        }
      });
      return obj;
    }
    function config(options) {
      var path = ".env";
      var encoding = "utf8";
      if (options) {
        if (options.path) {
          path = options.path;
        }
        if (options.encoding) {
          encoding = options.encoding;
        }
      }
      try {
        var parsedObj = parse(fs.readFileSync(path, { encoding }));
        Object.keys(parsedObj).forEach(function(key) {
          process.env[key] = process.env[key] || parsedObj[key];
        });
        return { parsed: parsedObj };
      } catch (e) {
        return { error: e };
      }
    }
    module.exports.config = config;
    module.exports.load = config;
    module.exports.parse = parse;
  }
});

// src/util/compile-vercel-config.ts
var import_dotenv = __toESM(require_main(), 1);
import { mkdir, writeFile, unlink, access } from "fs/promises";
import { join, basename } from "path";
import { fork } from "child_process";
import { NowBuildError } from "@vercel/build-utils";
function toRouteFormat(item) {
  if ("src" in item)
    return item;
  const { source, destination, headers, statusCode, permanent, ...rest } = item;
  const route = {
    src: source,
    ...rest
  };
  if (destination)
    route.dest = destination;
  if (headers)
    route.headers = Object.fromEntries(headers.map((h) => [h.key, h.value]));
  if (statusCode !== void 0) {
    route.status = statusCode;
  } else if (permanent !== void 0) {
    route.status = permanent ? 308 : 307;
  }
  return route;
}
function normalizeConfig(config) {
  const normalized = { ...config };
  const { rewrites, redirects, headers } = normalized;
  let allRoutes = normalized.routes || [];
  const hasRoutes = allRoutes.length > 0;
  const hasRewrites = (rewrites?.length ?? 0) > 0;
  const hasRedirects = (redirects?.length ?? 0) > 0;
  const hasHeaders = (headers?.length ?? 0) > 0;
  function hasRouteFormat(items) {
    return items?.some((item) => "src" in item) ?? false;
  }
  if (hasRoutes && (hasRewrites || hasRedirects || hasHeaders)) {
    return normalized;
  }
  const shouldConvertRewrites = hasRewrites && hasRouteFormat(rewrites);
  const shouldConvertRedirects = hasRedirects && hasRouteFormat(redirects);
  const shouldConvertHeaders = hasHeaders && hasRouteFormat(headers);
  const someWillConvert = shouldConvertRewrites || shouldConvertRedirects || shouldConvertHeaders;
  const someWontConvert = hasRewrites && !shouldConvertRewrites || hasRedirects && !shouldConvertRedirects || hasHeaders && !shouldConvertHeaders;
  if (someWillConvert && someWontConvert) {
    throw new NowBuildError({
      code: "INVALID_VERCEL_CONFIG",
      message: "Transforms (e.g., requestHeaders) require the `routes` format, which cannot be used alongside `rewrites`, `redirects`, or `headers`. Move everything into the `routes` array instead.",
      link: "https://vercel.com/docs/projects/project-configuration#routes"
    });
  }
  if (rewrites && shouldConvertRewrites) {
    allRoutes = [...allRoutes, ...rewrites.map(toRouteFormat)];
    delete normalized.rewrites;
  }
  if (redirects && shouldConvertRedirects) {
    allRoutes = [...allRoutes, ...redirects.map(toRouteFormat)];
    delete normalized.redirects;
  }
  if (headers && shouldConvertHeaders) {
    allRoutes = [...allRoutes, ...headers.map(toRouteFormat)];
    delete normalized.headers;
  }
  if (allRoutes.length > 0) {
    normalized.routes = allRoutes.map(toRouteFormat);
  }
  return normalized;
}
var VERCEL_CONFIG_EXTENSIONS = [
  "ts",
  "mts",
  "js",
  "mjs",
  "cjs"
];
var DEFAULT_VERCEL_CONFIG_FILENAME = "Vercel config";
async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
async function findAllVercelConfigFiles(workPath) {
  const foundFiles = [];
  for (const ext of VERCEL_CONFIG_EXTENSIONS) {
    const configPath = join(workPath, `vercel.${ext}`);
    if (await fileExists(configPath)) {
      foundFiles.push(configPath);
    }
  }
  return foundFiles;
}
async function findSourceVercelConfigFile(workPath) {
  for (const ext of VERCEL_CONFIG_EXTENSIONS) {
    const configPath = join(workPath, `vercel.${ext}`);
    if (await fileExists(configPath)) {
      return basename(configPath);
    }
  }
  return null;
}
async function findVercelConfigFile(workPath) {
  const foundFiles = await findAllVercelConfigFiles(workPath);
  if (foundFiles.length > 1) {
    throw new ConflictingConfigFiles(
      foundFiles,
      "Multiple vercel config files found. Please use only one configuration file.",
      "https://vercel.com/docs/projects/project-configuration"
    );
  }
  return foundFiles[0] || null;
}
function parseConfigLoaderError(stderr) {
  if (!stderr.trim()) {
    return "";
  }
  const moduleNotFoundMatch = stderr.match(
    /Error \[ERR_MODULE_NOT_FOUND\]: Cannot find package '([^']+)'/
  );
  if (moduleNotFoundMatch) {
    const packageName = moduleNotFoundMatch[1];
    return `Cannot find package '${packageName}'. Make sure it's installed in your project dependencies.`;
  }
  const syntaxErrorMatch = stderr.match(/SyntaxError: (.+?)(?:\n|$)/);
  if (syntaxErrorMatch) {
    return `Syntax error: ${syntaxErrorMatch[1]}`;
  }
  const errorMatch = stderr.match(
    /^(?:Error|TypeError|ReferenceError): (.+?)(?:\n|$)/m
  );
  if (errorMatch) {
    return errorMatch[1];
  }
  return stderr.trim();
}
async function compileVercelConfig(workPath) {
  const vercelJsonPath = join(workPath, "vercel.json");
  const nowJsonPath = join(workPath, "now.json");
  const hasVercelJson = await fileExists(vercelJsonPath);
  const hasNowJson = await fileExists(nowJsonPath);
  if (hasVercelJson && hasNowJson) {
    throw new ConflictingConfigFiles([vercelJsonPath, nowJsonPath]);
  }
  const vercelConfigPath = await findVercelConfigFile(workPath);
  const vercelDir = join(workPath, VERCEL_DIR);
  const compiledConfigPath = join(vercelDir, "vercel.json");
  if (vercelConfigPath && hasNowJson) {
    throw new ConflictingConfigFiles(
      [vercelConfigPath, nowJsonPath],
      `Both ${basename(vercelConfigPath)} and now.json exist in your project. Please use only one configuration method.`,
      "https://vercel.com/docs/projects/project-configuration"
    );
  }
  if (vercelConfigPath && hasVercelJson) {
    throw new ConflictingConfigFiles(
      [vercelConfigPath, vercelJsonPath],
      `Both ${basename(vercelConfigPath)} and vercel.json exist in your project. Please use only one configuration method.`,
      "https://vercel.com/docs/projects/project-configuration"
    );
  }
  if (!vercelConfigPath) {
    if (hasVercelJson) {
      return {
        configPath: vercelJsonPath,
        wasCompiled: false
      };
    }
    if (hasNowJson) {
      return {
        configPath: nowJsonPath,
        wasCompiled: false
      };
    }
    if (await fileExists(compiledConfigPath)) {
      return {
        configPath: compiledConfigPath,
        wasCompiled: true,
        sourceFile: await findSourceVercelConfigFile(workPath) ?? void 0
      };
    }
    return {
      configPath: null,
      wasCompiled: false
    };
  }
  (0, import_dotenv.config)({ path: join(workPath, ".env") });
  (0, import_dotenv.config)({ path: join(workPath, ".env.local") });
  const tempOutPath = join(vercelDir, "vercel-temp.mjs");
  const loaderPath = join(vercelDir, "vercel-loader.mjs");
  try {
    const { build } = await import("esbuild");
    await mkdir(vercelDir, { recursive: true });
    await build({
      entryPoints: [vercelConfigPath],
      bundle: true,
      platform: "node",
      format: "esm",
      outfile: tempOutPath,
      packages: "external",
      target: "node20",
      sourcemap: "inline"
    });
    const loaderScript = `
      import { pathToFileURL } from 'url';
      const configModule = await import(pathToFileURL(process.argv[2]).href);
      const config = ('default' in configModule) ? configModule.default : ('config' in configModule) ? configModule.config : configModule;
      process.send(config);
    `;
    await writeFile(loaderPath, loaderScript, "utf-8");
    const config = await new Promise((resolve, reject) => {
      const child = fork(loaderPath, [tempOutPath], {
        stdio: ["pipe", "pipe", "pipe", "ipc"]
      });
      let stderrOutput = "";
      let stdoutOutput = "";
      if (child.stderr) {
        child.stderr.on("data", (data) => {
          stderrOutput += data.toString();
        });
      }
      if (child.stdout) {
        child.stdout.on("data", (data) => {
          stdoutOutput += data.toString();
        });
      }
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error("Config loader timed out after 10 seconds"));
      }, 1e4);
      child.on("message", (message) => {
        clearTimeout(timeout);
        child.kill();
        resolve(message);
      });
      child.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
      child.on("exit", (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          if (stderrOutput.trim()) {
            output_manager_default.log(stderrOutput);
          }
          if (stdoutOutput.trim()) {
            output_manager_default.log(stdoutOutput);
          }
          const parsedError = parseConfigLoaderError(stderrOutput);
          if (parsedError) {
            reject(new Error(parsedError));
          } else if (stdoutOutput.trim()) {
            reject(new Error(stdoutOutput.trim()));
          } else {
            reject(new Error(`Config loader exited with code ${code}`));
          }
        }
      });
    });
    const normalizedConfig = normalizeConfig(config);
    await writeFile(
      compiledConfigPath,
      JSON.stringify(normalizedConfig, null, 2),
      "utf-8"
    );
    output_manager_default.debug(`Compiled ${vercelConfigPath} -> ${compiledConfigPath}`);
    return {
      configPath: compiledConfigPath,
      wasCompiled: true,
      sourceFile: await findSourceVercelConfigFile(workPath) ?? void 0
    };
  } catch (error) {
    throw new NowBuildError({
      code: error.code ?? "vercel_ts_compilation_failed",
      message: `Failed to compile ${basename(vercelConfigPath)}: ${error.message}`,
      link: error.link ?? "https://vercel.com/docs/projects/project-configuration"
    });
  } finally {
    await Promise.all([
      unlink(tempOutPath).catch((err) => {
        if (err.code !== "ENOENT") {
          output_manager_default.debug(`Failed to cleanup temp file: ${err}`);
        }
      }),
      unlink(loaderPath).catch((err) => {
        if (err.code !== "ENOENT") {
          output_manager_default.debug(`Failed to cleanup loader file: ${err}`);
        }
      })
    ]);
  }
}
async function getVercelConfigPath(workPath) {
  const vercelJsonPath = join(workPath, "vercel.json");
  const nowJsonPath = join(workPath, "now.json");
  const compiledConfigPath = join(workPath, VERCEL_DIR, "vercel.json");
  if (await fileExists(vercelJsonPath)) {
    return vercelJsonPath;
  }
  if (await fileExists(nowJsonPath)) {
    return nowJsonPath;
  }
  if (await fileExists(compiledConfigPath)) {
    return compiledConfigPath;
  }
  return nowJsonPath;
}

export {
  require_main,
  normalizeConfig,
  VERCEL_CONFIG_EXTENSIONS,
  DEFAULT_VERCEL_CONFIG_FILENAME,
  findSourceVercelConfigFile,
  compileVercelConfig,
  getVercelConfigPath
};
