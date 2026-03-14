import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirname_ } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname_(__filename);
import {
  formatErrorJson,
  formatSchemaDetailJson,
  formatSchemaListJson,
  getAggregations,
  getEvent,
  getEventNames,
  validateEvent
} from "./chunk-BQ3DXZNT.js";
import "./chunk-IE7MNZ56.js";
import {
  indent_default
} from "./chunk-A3NYPUKZ.js";
import {
  formatTable
} from "./chunk-SGGLJFUZ.js";
import {
  validateJsonOutput
} from "./chunk-XPKWKPWA.js";
import {
  schemaSubcommand
} from "./chunk-2DLBVZWU.js";
import "./chunk-LWBSOTJP.js";
import {
  require_pluralize
} from "./chunk-7EHTK7LP.js";
import "./chunk-GGP5R3FU.js";
import {
  getFlagsSpecification,
  parseArguments,
  printError
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

// src/commands/metrics/schema.ts
var import_chalk = __toESM(require_source(), 1);
var import_pluralize = __toESM(require_pluralize(), 1);
async function schema(client, telemetry) {
  let parsedArgs;
  const flagsSpecification = getFlagsSpecification(schemaSubcommand.options);
  try {
    parsedArgs = parseArguments(client.argv.slice(2), flagsSpecification);
  } catch (err) {
    printError(err);
    return 1;
  }
  const flags = parsedArgs.flags;
  const formatResult = validateJsonOutput(flags);
  if (!formatResult.valid) {
    output_manager_default.error(formatResult.error);
    return 1;
  }
  const jsonOutput = formatResult.jsonOutput;
  const event = flags["--event"];
  telemetry.trackCliOptionEvent(event);
  telemetry.trackCliOptionFormat(flags["--format"]);
  if (event) {
    const eventResult = validateEvent(event);
    if (!eventResult.valid) {
      if (jsonOutput) {
        client.stdout.write(
          formatErrorJson(
            eventResult.code,
            eventResult.message,
            eventResult.allowedValues
          )
        );
      } else {
        output_manager_default.error(eventResult.message);
        if (eventResult.allowedValues) {
          output_manager_default.print(
            `
Available events: ${eventResult.allowedValues.join(", ")}
`
          );
        }
      }
      return 1;
    }
    const eventData = getEvent(event);
    const eventWithName = { ...eventData, name: event };
    if (jsonOutput) {
      const hasNonCount = eventData.measures.some((m) => m.name !== "count");
      const sampleMeasure = hasNonCount ? eventData.measures.find((m) => m.name !== "count").name : eventData.measures.length > 0 ? "count" : "";
      const aggregations = sampleMeasure ? getAggregations(event, sampleMeasure) : [];
      client.stdout.write(formatSchemaDetailJson(eventWithName, aggregations));
    } else {
      output_manager_default.log(`Event: ${event} - ${eventData.description}`);
      const dimTable = formatDimensionsTable(eventWithName.dimensions);
      if (dimTable) {
        output_manager_default.print(dimTable);
        output_manager_default.print("\n");
      }
      const measTable = formatMeasuresTable(eventWithName.measures);
      if (measTable) {
        output_manager_default.print(measTable);
        output_manager_default.print("\n");
      }
    }
  } else {
    const events = getEventNames().map((name) => ({
      name,
      description: getEvent(name).description
    }));
    if (jsonOutput) {
      client.stdout.write(formatSchemaListJson(events));
    } else {
      output_manager_default.log(`${(0, import_pluralize.default)("Event", events.length, true)} found`);
      output_manager_default.print(formatEventsTable(events));
      output_manager_default.print("\n");
    }
  }
  return 0;
}
function formatEventsTable(events) {
  return indent_default(
    formatTable(
      ["Event", "Description"],
      ["l", "l"],
      [{ rows: events.map((e) => [e.name, e.description]) }]
    ),
    1
  );
}
function formatDimensionsTable(dimensions) {
  if (dimensions.length === 0) {
    return null;
  }
  return indent_default(
    formatTable(
      ["Dimension", "Label", "Groupable"],
      ["l", "l", "l"],
      [
        {
          rows: dimensions.map((d) => [
            d.name,
            d.label,
            d.filterOnly ? import_chalk.default.dim("no") : "yes"
          ])
        }
      ]
    ),
    1
  );
}
function formatMeasuresTable(measures) {
  if (measures.length === 0) {
    return null;
  }
  return indent_default(
    formatTable(
      ["Measure", "Label", "Unit"],
      ["l", "l", "l"],
      [{ rows: measures.map((m) => [m.name, m.label, m.unit]) }]
    ),
    1
  );
}
export {
  schema as default
};
