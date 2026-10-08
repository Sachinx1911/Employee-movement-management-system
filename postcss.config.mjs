// Used by the Webpack build (Hostinger). Turbopack (local dev) uses the
// @tailwindcss/turbopack loader configured in next.config.mjs instead.
const config = {
  plugins: { "@tailwindcss/postcss": {} },
};

export default config;
