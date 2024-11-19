import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node, // Node.js globals (e.g., require, __dirname)
        ...globals.browser, // Browser globals (e.g., document, window)
      },
    },
    rules: {
      "no-undef": "error", // Keep rule for catching undefined variables
    },
  },
];
