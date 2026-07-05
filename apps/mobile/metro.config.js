// Metro in a pnpm monorepo. pnpm's isolated node_modules (symlinks into a
// virtual .pnpm store) confuse Metro's default resolver — walking folders it
// can land a bare `react` import on the types-only @types/react (whose `main`
// is empty), and bundling dies. Two guards fix it deterministically:
//   1. block Metro from ever resolving into an @types/* package (they are
//      compile-time only and must never enter a runtime bundle), and
//   2. pin the core runtime packages to this app's own node_modules symlinks
//      via extraNodeModules, so there is one unambiguous copy.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;
config.resolver.unstable_enableSymlinks = true;
config.resolver.blockList = [/\/@types\/.*/];
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
};
module.exports = config;
