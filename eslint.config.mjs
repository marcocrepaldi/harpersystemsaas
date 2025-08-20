// eslint.config.js (Flat Config para Next.js + TypeScript)

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
  // 🔹 Regras JS base
  js.configs.recommended,

  // 🔹 Suporte TypeScript moderno
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // 🔹 Plugins
  {
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      import: importPlugin,
      tailwindcss: tailwind,
    },
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json", // garante verificação com TS
        tsconfigRootDir: __dirname,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
        },
      },
    },
    rules: {
      /* --- JavaScript/TypeScript --- */
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],

      /* --- React --- */
      "react/jsx-uses-react": "off", // Next 13+ não precisa importar React
      "react/react-in-jsx-scope": "off",
      "react/self-closing-comp": "warn",

      /* --- React Hooks --- */
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      /* --- Imports --- */
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling", "index"],
          ],
          pathGroups: [
            {
              pattern: "@/**",
              group: "internal",
            },
          ],
          "newlines-between": "always",
        },
      ],

      /* --- Tailwind --- */
      "tailwindcss/classnames-order": "warn",
      "tailwindcss/no-custom-classname": "off", // deixar off se usar tokens custom
    },
  },

  // 🔹 Extends herdados do Next.js (core-web-vitals + TS)
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];
