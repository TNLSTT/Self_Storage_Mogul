# Deployment Guide

This document explains how to build and deploy **Self Storage Mogul** so developers can publish the game to a static hosting platform. The app is a Svelte + Vite single-page application, so the deployment artifact is a static bundle generated in the `dist/` directory.

## Prerequisites
- **Node.js 20.x LTS** (or newer compatible with Vite 5)
- **npm** (bundled with Node) with access to the public npm registry
- Optional: accounts with your chosen hosting provider (Vercel, Netlify, GitHub, Cloudflare, S3, etc.)

## 1. Install Dependencies
```bash
# Install project dependencies
npm install
```

If you are building on a CI runner, ensure the runner uses Node.js 20 (`actions/setup-node@v4` on GitHub Actions, `NODE_VERSION=20` on Netlify/Vercel).

## 2. Configure Environment Variables
All runtime configuration must be exposed through variables prefixed with `VITE_` so that Vite embeds them during the build.

Optional variables currently supported by the project:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_KEY`
- `VITE_ANALYTICS_TOKEN`

Create a `.env.production` file at the repository root or define the variables in your hosting provider's dashboard/CLI before building:
```bash
# .env.production
VITE_SUPABASE_URL="https://your.supabase.url"
VITE_SUPABASE_KEY="public-anon-key"
VITE_ANALYTICS_TOKEN="analytics-token"
```

> ⚠️ Because this is a static build, secrets must be safe to expose in client-side code. Use public tokens only.

## 3. Run Checks and Build
```bash
# Optional but recommended: type-check the project
npm run check

# Create an optimized production bundle in dist/
npm run build
```

The build output is written to `dist/`. Use `npm run preview` to serve the production bundle locally for smoke testing.

## 4. Deploying the Static Bundle
You can host the `dist/` directory on any static host. Below are suggested workflows.

### Vercel (Recommended)
1. Install the Vercel CLI (`npm i -g vercel`) and authenticate with `vercel login`, or connect the GitHub repository in the Vercel dashboard.
2. Set the project settings:
   - **Framework Preset:** SvelteKit/Svelte (static)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
3. Define any `VITE_` variables in *Project Settings → Environment Variables* (choose the `Production` environment).
4. Deploy:
   - CLI: `vercel --prod`
   - Git integration: push to the default branch and let Vercel build automatically.

### Netlify
1. Install the Netlify CLI (`npm i -g netlify-cli`) or configure via the Netlify dashboard.
2. Project settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** `20`
3. Add environment variables under *Site settings → Build & deploy → Environment*.
4. Deploy:
   - CLI: `netlify deploy --prod`
   - Git integration: enable *Continuous Deployment* and push to your main branch.

### GitHub Pages
1. Add `gh-pages` as a dev dependency if not already installed: `npm install --save-dev gh-pages`.
2. Optional: set the Vite base path if deploying to a project page (e.g., `defineConfig({ base: '/<repo-name>/', ... })`).
3. Build the project: `npm run build`.
4. Publish: `npx gh-pages -d dist`.
5. For automatic deployments, create a GitHub Actions workflow that runs on `push` and publishes `dist/` to the `gh-pages` branch.

### Generic Static Hosting (S3, Cloudflare Pages, etc.)
1. Run `npm run build`.
2. Upload the contents of `dist/` to your bucket or hosting provider.
3. Ensure the host is configured to serve `index.html` for all routes (single-page application fallback).
4. Configure caching headers for static assets (`immutable` for hashed files, shorter TTL for `index.html`).

## 5. Continuous Integration (Optional)
A minimal GitHub Actions workflow (`.github/workflows/deploy.yml`) might look like:
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm install
      - run: npm run check
      - run: npm run build
      - name: Deploy to Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: dist
```
Adjust the final deployment step to match your hosting provider (e.g., Netlify deploy action, AWS CLI sync).

## 6. Post-Deployment Verification
- Load the deployed site and open the browser console for errors.
- Confirm analytics or Supabase integrations initialize using the configured `VITE_` variables.
- Validate the single-page app routing by refreshing on non-root routes (hosts must serve `index.html`).
- Optionally run automated smoke tests against the production URL.

## Troubleshooting
| Symptom | Likely Cause | Fix |
| --- | --- | --- |
| Blank screen after deploy | SPA fallback not configured | Enable rewrite of all routes to `index.html` |
| Environment variables undefined | Missing `VITE_` prefix or not set in hosting provider | Rename variables with `VITE_` prefix and redeploy |
| Old assets served | CDN caching `index.html` | Invalidate cache or reduce `index.html` cache TTL |
| Build fails on CI | Wrong Node.js version | Ensure Node 20.x is installed before `npm install` |

With these steps, any developer can reproduce a production build and publish Self Storage Mogul to their hosting platform of choice.
