// Metro in a pnpm monorepo. pnpm's isolated, symlinked store trips up Metro's
// resolver in two ways; both are handled here without changing the install
// layout or any dependency versions:
//
//  1. A bare `react` import can land on the types-only @types/react package
//     (empty `main`, no runtime code). We force `react`/`react-native` to this
//     app's own copy by module name — separator-independent, so it holds on
//     Windows backslash paths and POSIX alike — and block @types/* outright.
//
//  2. A transitive like `expo-modules-core` (a dep of `expo`) lives nested in
//     .pnpm/expo@…/node_modules. Metro's own walk finds it on hoisted layouts
//     but can miss it on strict ones (notably Windows). So on any resolution
//     miss we fall back to Node's resolver from the importing file, which
//     follows pnpm's symlinks the same way on every OS.
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
  try {
    return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
  } catch (err) {
    // Bare package that Metro couldn't place in the pnpm store — resolve it
    // with Node from the importing file's directory (follows pnpm symlinks
    // identically on every OS). Relative/absolute imports are Metro's job.
    if (moduleName.startsWith(".") || moduleName.startsWith("/")) throw err;
    try {
      const fromDir = path.dirname(context.originModulePath);
      return {
        type: "sourceFile",
        filePath: require.resolve(moduleName, { paths: [fromDir, projectRoot] }),
      };
    } catch {
      throw err;
    }
  }
};
module.exports = config;
