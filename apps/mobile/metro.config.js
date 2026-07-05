// Metro in a pnpm monorepo. Two independent things have to be true:
//
//  1. Metro must walk pnpm's nested store to resolve transitive deps — e.g.
//     `expo` importing `expo-modules-core`, which lives beside it inside
//     .pnpm/expo@…/node_modules. So hierarchical lookup stays ON (the default);
//     turning it off breaks those nested resolutions on strict pnpm layouts
//     (notably Windows, where fewer packages are hoisted to the root).
//
//  2. A bare `react` import must not land on the types-only @types/react
//     package (empty `main`, no runtime code). We force `react`/`react-native`
//     to this app's own copy in resolveRequest — by module name, so it's
//     separator-independent (Windows backslash paths and POSIX alike) — and
//     also block @types/* from the bundle as defence in depth.
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
config.resolver.unstable_enableSymlinks = true;
config.resolver.blockList = [/[\\/]@types[\\/]/];

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
