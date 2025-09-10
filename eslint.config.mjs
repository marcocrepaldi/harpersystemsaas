// eslint.config.mjs (Flat Config para Next.js + TypeScript)
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import importPlugin from "eslint-plugin-import";
import tailwind from "eslint-plugin-tailwindcss";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  // Ignorar artefatos de build
  { ignores: ["node_modules", ".next", "dist", "out", ".turbo", ".vercel"] },

  // 🔹 Regras JS base
  js.configs.recommended,

  // 🔹 Suporte TypeScript moderno (com type-check)
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // 🔹 Plugins e regras
  {
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      import: importPlugin,
      tailwindcss: tailwind,
    },
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser, // garante parser TS no flat config
      parserOptions: {
        // Se usar o tsconfig.eslint.json, troque aqui
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    settings: {
      react: { version: "detect" },
      "import/resolver": {
        // Para ordenação/validação de imports com paths TS e "@/*"
        typescript: { project: "./tsconfig.json" }
      },
    },
    rules: {
      /* --- JavaScript/TypeScript --- */
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],

      /* --- React --- */
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react/self-closing-comp": "warn",

      /* --- React Hooks --- */
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      /* --- Imports --- */
      "import/order": [
        "warn",
        {
          groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
          pathGroups: [{ pattern: "@/**", group: "internal" }],
          "newlines-between": "always"
        }
      ],

      /* --- Tailwind --- */
      "tailwindcss/classnames-order": "warn",
      "tailwindcss/no-custom-classname": "off"
    },
  },

  // 🔹 Extends herdados do Next.js (core-web-vitals + TS)
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];
