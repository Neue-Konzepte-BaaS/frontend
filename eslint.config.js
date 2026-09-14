import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  { ignores: ["build/", ".react-router/", "node_modules/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      // Just the two classic, always-correct checks — eslint-plugin-react-hooks's
      // own "recommended" now bundles a much larger React Compiler rule set
      // (immutability, refs, purity, …) this project doesn't opt into (no
      // babel-plugin-react-compiler configured), and several of those rules
      // flag this codebase's deliberate ref-mutation-during-render pattern
      // (see field-map.tsx) that's safe under plain React semantics.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
);
