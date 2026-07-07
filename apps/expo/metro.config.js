// Learn more: https://docs.expo.dev/guides/monorepos/
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { FileStore } = require("metro-cache");
const { withNativewind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

const ignoredWorkspacePaths = [
  /(^|[/\\])\.expo[/\\].*/,
  /(^|[/\\])\.next[/\\].*/,
  /(^|[/\\])\.scratch[/\\].*/,
  /(^|[/\\])\.turbo[/\\].*/,
  /(^|[/\\])apps[/\\]expo[/\\]e2e[/\\].*/,
  /(^|[/\\])apps[/\\]expo[/\\]test-results[/\\].*/,
  /(^|[/\\])apps[/\\]nextjs[/\\]test-results[/\\].*/,
];

config.cacheStores = [
  new FileStore({
    root: path.join(__dirname, "node_modules", ".cache", "metro"),
  }),
];

config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : [config.resolver.blockList].filter(Boolean)),
  ...ignoredWorkspacePaths,
];

/** @type {import('expo/metro-config').MetroConfig} */
module.exports = withNativewind(config);
