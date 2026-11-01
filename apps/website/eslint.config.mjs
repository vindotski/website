import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import checkFile from "eslint-plugin-check-file";

// bulletproof-react's layers: shared code → features → app. Each feature may
// use shared code and itself, never another feature; app composes them
const features = ["admin", "auth", "blog", "profile", "projects", "search"];
const shared = ["components", "config", "hooks", "lib", "types", "utils"];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            // No cross-feature imports: features/blog can't import
            // features/projects, and so on
            ...features.map((feature) => ({
              target: `./features/${feature}`,
              from: "./features",
              except: [`./${feature}`],
              message: "Features can't import each other; compose them in app/.",
            })),
            // One direction: app imports features, never the other way
            {
              target: "./features",
              from: "./app",
              message: "Features can't import app/.",
            },
            // Shared code imports neither features nor app
            {
              target: shared.map((folder) => `./${folder}`),
              from: ["./features", "./app"],
              message: "Shared code can't import features/ or app/.",
            },
          ],
        },
      ],
    },
  },
  // kebab-case file and folder names; app/ also allows Next's route folder
  // forms: (group), [param], _private
  {
    files: ["**/*.{ts,tsx,mts}"],
    plugins: { "check-file": checkFile },
    rules: {
      "check-file/filename-naming-convention": [
        "error",
        { "**/*.{ts,tsx,mts}": "KEBAB_CASE" },
        { ignoreMiddleExtensions: true },
      ],
      "check-file/folder-naming-convention": [
        "error",
        {
          "app/**/": "NEXT_JS_APP_ROUTER_CASE",
          "{components,config,features,lib,types,scripts}/**/": "KEBAB_CASE",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
