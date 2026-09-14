import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "max-lines": ["warn", { max: 200, skipBlankLines: true, skipComments: true }],
      eqeqeq: ["error", "always"],
      "no-console": ["warn", { allow: ["error", "warn"] }],
    },
  },
);
