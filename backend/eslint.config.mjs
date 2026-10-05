// Flat ESLint config: catches real bugs (unused code, unsafe patterns) without
// re-styling the codebase. Formatting is left to the editor.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "storage/**", "comfyui-workflows/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module" },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
      "@typescript-eslint/no-require-imports": "off", // lazy requires keep inline mode free of Redis
      "@typescript-eslint/no-namespace": "off", // Express request augmentation
      "no-empty": ["error", { allowEmptyCatch: true }],
      "prefer-const": "error",
    },
  },
);
