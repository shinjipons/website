import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || "https://shinjipons.com", // Update with your actual production URL
  integrations: [],
});
