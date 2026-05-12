import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  { ignores: ["dist", "node_modules", "functions"] },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    settings: { react: { version: "18.3" } },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      "react/jsx-no-target-blank": "off",
      // shadcn/ui components don't ship PropTypes and we don't use them
      "react/prop-types": "off",
      // `import React` is occasionally needed for class components but is otherwise harmless
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^React$" }],
      "react/no-unescaped-entities": "off",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    // Tooling / config files run in Node — give them Node globals and a
    // friendlier ruleset.
    files: ["*.config.js", "vite-plugins/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node },
      sourceType: "module",
    },
  },
  {
    // shadcn/ui components and the visual-edit agent rely on custom DOM
    // attributes (cmdk-input-wrapper, data-source-location, etc) that ESLint
    // flags as unknown. They're vendor code we don't author — turn the rule
    // off for these paths only.
    files: ["src/components/ui/**/*.jsx", "src/lib/VisualEditAgent.jsx"],
    rules: {
      "react/no-unknown-property": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
];

