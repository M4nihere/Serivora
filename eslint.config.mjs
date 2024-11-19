import globals from "globals";
import pluginJs from "@eslint/js";


/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        require: "readonly",
        __dirname: "readonly",
        module: "readonly",
      },
    },
    env: {
      node: true, // Enable Node.js global variables
    },
    rules: {
      "no-undef": "error", // Keep rule for other undefined variables
    },
  },
];
