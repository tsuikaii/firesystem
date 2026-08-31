// Keep local Wrangler and Miniflare state inside the project checkout.
// This module is imported before the Cloudflare Vite plugin is evaluated.
process.env.WRANGLER_WRITE_LOGS ??= 'false';
process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';
