import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirname_ } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname_(__filename);
import {
  updateRouteVersion
} from "./chunk-PMSMUMUO.js";
import {
  getRouteVersions
} from "./chunk-AHU7WNL2.js";
import {
  confirmAction,
  ensureProjectLink,
  findVersionById,
  getRoutes,
  parseSubcommandArgs,
  printDiffSummary,
  validateRequiredArgs
} from "./chunk-TNBMKNET.js";
import {
  restoreSubcommand
} from "./chunk-U6XOC6E4.js";
import "./chunk-AQLVWVEN.js";
import "./chunk-P4I4DMEU.js";
import {
  stamp_default
} from "./chunk-SOTR4CXR.js";
import "./chunk-7EHTK7LP.js";
import "./chunk-GGP5R3FU.js";
import {
  getCommandName
} from "./chunk-ZLCMHY2G.js";
import "./chunk-3XFFP2BA.js";
import {
  output_manager_default
} from "./chunk-FDJURQMQ.js";
import {
  require_source
} from "./chunk-S7KYDPEM.js";
import {
  __toESM
} from "./chunk-TZ2YI2VH.js";

// src/commands/routes/restore.ts
var import_chalk = __toESM(require_source(), 1);
async function restore(client, argv) {
  const parsed = await parseSubcommandArgs(argv, restoreSubcommand);
  if (typeof parsed === "number")
    return parsed;
  const error = validateRequiredArgs(parsed.args, ["version-id"]);
  if (error) {
    output_manager_default.error(error);
    return 1;
  }
  const link = await ensureProjectLink(client);
  if (typeof link === "number")
    return link;
  const { project, org } = link;
  const teamId = org.type === "team" ? org.id : void 0;
  const [versionIdentifier] = parsed.args;
  output_manager_default.spinner(`Fetching route versions for ${import_chalk.default.bold(project.name)}`);
  const { versions } = await getRouteVersions(client, project.id, { teamId });
  const result = findVersionById(versions, versionIdentifier);
  if (result.error) {
    output_manager_default.error(result.error);
    return 1;
  }
  const version = result.version;
  if (!version) {
    output_manager_default.error("Version not found.");
    return 1;
  }
  if (version.isLive) {
    output_manager_default.error(
      `Version ${import_chalk.default.bold(
        version.id.slice(0, 12)
      )} is currently live. You cannot restore the live version.
Run ${import_chalk.default.cyan(
        getCommandName("routes list-versions")
      )} to see previous versions you can restore.`
    );
    return 1;
  }
  if (version.isStaging) {
    output_manager_default.error(
      `Version ${import_chalk.default.bold(
        version.id.slice(0, 12)
      )} is staged. Use ${import_chalk.default.cyan(
        getCommandName("routes publish")
      )} to publish it instead.`
    );
    return 1;
  }
  output_manager_default.spinner("Fetching changes");
  const { routes: diffRoutes } = await getRoutes(client, project.id, {
    teamId,
    versionId: version.id,
    diff: true
  });
  const changedRoutes = diffRoutes.filter((r) => r.action !== void 0);
  if (changedRoutes.length > 0) {
    output_manager_default.print(`
${import_chalk.default.bold("Changes to be restored:")}

`);
    printDiffSummary(changedRoutes);
    output_manager_default.print("\n");
  } else {
    output_manager_default.print(
      `
${import_chalk.default.gray("No changes detected from current production version.")}

`
    );
  }
  const confirmed = await confirmAction(
    client,
    parsed.flags["--yes"],
    `Restore version ${import_chalk.default.bold(version.id.slice(0, 12))} to production?`,
    `This will replace the current live routes for ${import_chalk.default.bold(project.name)}.`
  );
  if (!confirmed) {
    output_manager_default.log("Canceled");
    return 0;
  }
  const updateStamp = stamp_default();
  output_manager_default.spinner(`Restoring version ${import_chalk.default.bold(version.id.slice(0, 12))}`);
  try {
    const { version: newVersion } = await updateRouteVersion(
      client,
      project.id,
      version.id,
      "restore",
      { teamId }
    );
    output_manager_default.log(
      `${import_chalk.default.cyan("Success!")} Version ${import_chalk.default.bold(
        newVersion.id.slice(0, 12)
      )} restored to production ${import_chalk.default.gray(updateStamp())}`
    );
    if (newVersion.ruleCount !== void 0) {
      output_manager_default.print(
        `  ${import_chalk.default.bold("Active routes:")} ${newVersion.ruleCount}
`
      );
    }
    return 0;
  } catch (e) {
    const error2 = e;
    output_manager_default.error(error2.message || "Failed to restore version");
    return 1;
  }
}
export {
  restore as default
};
