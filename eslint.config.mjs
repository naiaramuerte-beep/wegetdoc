/**
 * ESLint config focused on catching bugs that would crash production.
 * The star of the show is `react-hooks/rules-of-hooks` — which would have
 * caught the hooks-after-early-return bug we shipped on 2026-04-22.
 *
 * Everything else is off or set to "warn" so we don't drown in style noise.
 */
import tsParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "client/public/webviewer/**",
      "drizzle/**",
      ".claude/**",
      "scripts/**/*.mjs",
      "*.config.*",
    ],
  },
  {
    files: ["client/**/*.{ts,tsx}", "server/**/*.{ts,tsx}", "shared/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        // Browser
        window: "readonly", document: "readonly", navigator: "readonly",
        fetch: "readonly", URL: "readonly", URLSearchParams: "readonly",
        localStorage: "readonly", sessionStorage: "readonly",
        atob: "readonly", btoa: "readonly",
        Blob: "readonly", File: "readonly", FileReader: "readonly", FormData: "readonly",
        Image: "readonly", HTMLElement: "readonly", HTMLInputElement: "readonly",
        HTMLDivElement: "readonly", HTMLCanvasElement: "readonly", HTMLImageElement: "readonly",
        HTMLButtonElement: "readonly", HTMLAnchorElement: "readonly", HTMLSelectElement: "readonly",
        HTMLTextAreaElement: "readonly", HTMLLIElement: "readonly", HTMLFormElement: "readonly",
        Event: "readonly", MouseEvent: "readonly", KeyboardEvent: "readonly", DragEvent: "readonly",
        MessageEvent: "readonly", ClipboardEvent: "readonly", PointerEvent: "readonly",
        TouchEvent: "readonly", FocusEvent: "readonly", Touch: "readonly",
        XMLHttpRequest: "readonly", DOMException: "readonly", AbortController: "readonly",
        requestAnimationFrame: "readonly", cancelAnimationFrame: "readonly",
        setTimeout: "readonly", clearTimeout: "readonly",
        setInterval: "readonly", clearInterval: "readonly",
        queueMicrotask: "readonly", structuredClone: "readonly",
        alert: "readonly", confirm: "readonly", prompt: "readonly",
        console: "readonly", crypto: "readonly",
        Uint8Array: "readonly", Uint16Array: "readonly", Int8Array: "readonly",
        CustomEvent: "readonly", Node: "readonly", Element: "readonly",
        matchMedia: "readonly", getComputedStyle: "readonly",
        // Node
        process: "readonly", Buffer: "readonly", global: "readonly",
        __dirname: "readonly", __filename: "readonly", require: "readonly",
        // Vite
        "import.meta": "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      // ── Critical rule: this blocks the class of bug that crashed prod 2026-04-22 ──
      "react-hooks/rules-of-hooks": "error",   // hooks after early return / conditional / in loops → hard fail.
      // Informational only — don't block, but surface missing deps.
      "react-hooks/exhaustive-deps": "warn",
      // Everything else is handled by `tsc --noEmit` (the other half of the pre-push hook).
    },
    settings: {
      react: { version: "detect" },
    },
  },
];
