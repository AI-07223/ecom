import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Firebase DataConnect auto-generated files (use CommonJS require)
    "src/dataconnect-generated/**",
    "src/dataconnect-admin-generated/**",
  ]),
  {
    rules: {
      // Disable rules that are causing issues with existing codebase
      // These are pre-existing issues that would require significant refactoring
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
