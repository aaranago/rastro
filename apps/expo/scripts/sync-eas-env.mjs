#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv, parseArgs as parseNodeArgs } from "node:util";

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appDir, "..", "..");
const defaultEnvFiles = [join(repoRoot, ".env.local"), join(repoRoot, ".env")];
const allowedEnvironments = new Set(["development", "preview", "production"]);

const variableDefinitions = [
  {
    name: "EXPO_PUBLIC_API_BASE_URL",
    visibility: "plaintext",
    requiredFor: new Set(["preview", "production"]),
    validate: validateHttpUrl,
    warnWhen: warnWhenProductionLikeLocalUrl,
  },
  {
    name: "EXPO_PUBLIC_EAS_PROJECT_ID",
    visibility: "plaintext",
    requiredFor: new Set(["development", "preview", "production"]),
  },
  {
    name: "EXPO_PUBLIC_AUTH_SOCIAL_PROVIDERS",
    visibility: "plaintext",
    requiredFor: new Set(),
  },
  {
    name: "EXPO_ANDROID_GOOGLE_MAPS_API_KEY",
    visibility: "sensitive",
    requiredFor: new Set(["development", "preview", "production"]),
  },
  {
    name: "EXPO_IOS_GOOGLE_MAPS_API_KEY",
    visibility: "sensitive",
    requiredFor: new Set(),
  },
  {
    name: "EXPO_LOCATION_WHEN_IN_USE_PERMISSION",
    visibility: "plaintext",
    requiredFor: new Set(),
  },
  {
    name: "EXPO_IMAGE_PICKER_PHOTOS_PERMISSION",
    visibility: "plaintext",
    requiredFor: new Set(),
  },
  {
    name: "EXPO_IMAGE_PICKER_CAMERA_PERMISSION",
    visibility: "plaintext",
    requiredFor: new Set(),
  },
];

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  printHelp();
  process.exit(0);
}

const targetEnvironments = options.all
  ? ["development", "preview", "production"]
  : options.environments.length > 0
    ? options.environments
    : ["preview"];

const invalidEnvironments = targetEnvironments.filter(
  (environment) => !allowedEnvironments.has(environment),
);

if (invalidEnvironments.length > 0) {
  console.error(
    `Unknown EAS environment(s): ${invalidEnvironments.join(", ")}. Use development, preview, or production.`,
  );
  process.exit(1);
}

const envFiles =
  options.envFiles.length > 0 ? options.envFiles : defaultEnvFiles;
const { values, loadedFiles } = loadEnvValues(envFiles);

if (loadedFiles.length === 0) {
  console.warn(
    `No env files found. Looked for: ${envFiles.map((file) => relative(file)).join(", ")}`,
  );
}

console.log(`EAS environments: ${targetEnvironments.join(", ")}`);
console.log(
  `Env files: ${loadedFiles.length > 0 ? loadedFiles.map((file) => relative(file)).join(", ") : "none"}`,
);

let pushed = 0;
let skipped = 0;
let failed = 0;

for (const environment of targetEnvironments) {
  console.log(`\n${environment}:`);

  for (const definition of variableDefinitions) {
    const value = values.get(definition.name)?.trim() ?? "";
    const isRequired = definition.requiredFor.has(environment);

    if (!value) {
      skipped += 1;
      const level = isRequired ? "WARN" : "info";
      console.warn(
        `  ${level}: ${definition.name} is not set; skipping${isRequired ? " (needed for this environment)" : " (optional)"}.`,
      );
      continue;
    }

    const validationError = definition.validate?.(value);

    if (validationError) {
      skipped += 1;
      console.warn(
        `  WARN: ${definition.name} is invalid; skipping. ${validationError}`,
      );
      continue;
    }

    const warning = definition.warnWhen?.(value, environment);

    if (warning) {
      skipped += 1;
      console.warn(`  WARN: ${definition.name} skipped. ${warning}`);
      continue;
    }

    if (options.dryRun) {
      pushed += 1;
      console.log(
        `  dry-run: would push ${definition.name}=${mask(value)} (${definition.visibility})`,
      );
      continue;
    }

    const result = spawnSync(
      "pnpm",
      [
        "dlx",
        "eas-cli@latest",
        "env:create",
        environment,
        "--name",
        definition.name,
        "--value",
        value,
        "--visibility",
        definition.visibility,
        "--scope",
        "project",
        "--force",
        "--non-interactive",
      ],
      {
        cwd: appDir,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8",
      },
    );

    if (result.status === 0) {
      pushed += 1;
      console.log(
        `  pushed ${definition.name}=${mask(value)} (${definition.visibility})`,
      );
      continue;
    }

    failed += 1;
    console.warn(`  WARN: failed to push ${definition.name}; continuing.`);
    const output = [result.stdout, result.stderr]
      .filter(Boolean)
      .join("\n")
      .replaceAll(value, mask(value))
      .trim();

    if (output) {
      console.warn(indent(output, "    "));
    }
  }
}

console.log(
  `\nDone. ${options.dryRun ? "Would push" : "Pushed"} ${pushed}; skipped ${skipped}; failed ${failed}.`,
);

if (failed > 0) {
  process.exit(1);
}

function parseArgs(args) {
  try {
    const { values } = parseNodeArgs({
      allowPositionals: false,
      args: args.filter((arg) => arg !== "--"),
      options: {
        all: { type: "boolean", default: false },
        "dry-run": { type: "boolean", default: false },
        env: { type: "string", multiple: true },
        "env-file": { type: "string", multiple: true },
        environment: { type: "string", multiple: true },
        help: { type: "boolean", short: "h", default: false },
      },
    });

    return {
      all: Boolean(values.all),
      dryRun: Boolean(values["dry-run"]),
      envFiles: asArray(values["env-file"]).map((file) => resolve(file)),
      environments: [...asArray(values.environment), ...asArray(values.env)],
      help: Boolean(values.help),
    };
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    printHelp();
    process.exit(1);
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function loadEnvValues(files) {
  const values = new Map();
  const loadedFiles = [];

  for (const file of files) {
    if (!existsSync(file)) {
      continue;
    }

    loadedFiles.push(file);
    const parsed = parseEnv(readFileSync(file, "utf8"));

    for (const [name, value] of Object.entries(parsed)) {
      if (!values.has(name) && typeof value === "string") {
        values.set(name, value);
      }
    }
  }

  return { values, loadedFiles };
}

function validateHttpUrl(value) {
  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "URL must use http or https.";
    }

    return undefined;
  } catch {
    return "Value must be an absolute URL.";
  }
}

function warnWhenProductionLikeLocalUrl(value, environment) {
  if (environment === "development") {
    return undefined;
  }

  const url = new URL(value);
  const localHosts = new Set(["localhost", "127.0.0.1", "10.0.2.2", "0.0.0.0"]);

  if (localHosts.has(url.hostname) || url.hostname.endsWith(".local")) {
    return `${environment} builds need a reachable HTTPS API URL, not ${url.origin}.`;
  }

  if (url.protocol !== "https:") {
    return `${environment} builds should use HTTPS, not ${url.origin}.`;
  }

  return undefined;
}

function mask(value) {
  if (value.length <= 8) {
    return "***";
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function indent(value, prefix) {
  return value
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}

function relative(file) {
  return file.startsWith(repoRoot) ? file.slice(repoRoot.length + 1) : file;
}

function printHelp() {
  console.log(`
Sync the Expo mobile build env allowlist to EAS.

Usage:
  pnpm -F @acme/expo eas:env:sync -- --environment preview
  pnpm -F @acme/expo eas:env:sync -- --all
  pnpm -F @acme/expo eas:env:sync -- --environment preview --dry-run

Options:
  --environment, --env <name>  Target EAS environment: development, preview, production.
                              Can be passed more than once. Defaults to preview.
  --all                       Target development, preview, and production.
  --env-file <path>           Read a specific env file. Can be passed more than once.
                              Defaults to repo .env.local then repo .env.
  --dry-run                   Print what would be pushed without calling EAS.
  --help                      Show this help.

Only these variables are eligible:
  ${variableDefinitions.map((definition) => definition.name).join("\n  ")}
`);
}
