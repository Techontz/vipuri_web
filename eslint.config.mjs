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
    // The purchased theme, copied in verbatim. These are vendor build
    // artifacts (minified jQuery plugins, Bootstrap, the theme's own bundles)
    // and must stay byte-identical to the original — linting them is noise.
    "public/assets/**",
  ]),
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // The purchased theme's CSS targets bare `<img>` elements by class
      // (`.footer-payment__logo`, `.product-card__thumb img`, …). next/image
      // wraps the tag and injects its own sizing, which changes the layout we
      // are required to reproduce exactly.
      "@next/next/no-img-element": "off",

      // The theme ships compiled stylesheets that are loaded per route group —
      // storefront CSS must not reach the admin panel and vice versa. A <link>
      // in each group's layout is the mechanism that keeps them separate.
      "@next/next/no-css-tags": "off",

      // Flags two patterns we use deliberately: syncing a draft input to a
      // controlled prop, and settling loading state inside an async loader
      // started by an effect. Kept visible as a warning rather than silenced.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
