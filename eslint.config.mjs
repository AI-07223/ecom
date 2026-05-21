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
    // New Medusa + Next.js multi-tenant stack lints itself
    "platform/**",
    // Flutter mobile app has its own toolchain
    "flutter_firebase_app/**",
  ]),
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      "@next/next/no-img-element": "warn",
    },
  },
]);

export default eslintConfig;
