// Metro in a pnpm monorepo. pnpm's isolated node_modules (symlinks into a
// virtual .pnpm store) let Metro's default resolver land a bare `react` import
// on the types-only @types/react package (whose `main` is empty), which has no
// runtime code — so bundling dies. The fix must be OS-agnostic (Windows uses
// backslash paths), so we do it in the resolver, not with a slash-sensitive
// path regex:
//   1. resolveRequest forces `react`/`react-native` to THIS app's own copy, so
//      Metro never considers @types for them;
//   2. blockList (matching either path separator) keeps every @types/* package
//      out of the bundle entirely — they are compile-time only.
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

// Cross-platform: match /@types/ on POSIX and \@types\ on Windows.
config.resolver.blockList = [/[\\/]@types[\\/]/];

// Force the one true copy of the runtime packages, separator-independent.
const forcedRoots = {
  react: path.join(projectRoot, "node_modules", "react"),
  "react-native": path.join(projectRoot, "node_modules", "react-native"),
};
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (Object.prototype.hasOwnProperty.call(forcedRoots, moduleName)) {
    return { type: "sourceFile", filePath: require.resolve(forcedRoots[moduleName]) };
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};
module.exports = config;
