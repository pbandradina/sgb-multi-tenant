# Environment and Deployment Guide

## Current status
- `npm run check` completed successfully.
- `npm run build` completed successfully for both client and server.
- Vercel project is linked in `.vercel/project.json`.
- Vercel CLI is installed, but login is required to run deployment commands.

## Required environment variables

### Client build variables (`VITE_...`)
- `VITE_APP_ID` - OAuth application client ID.
- `VITE_OAUTH_PORTAL_URL` - OAuth portal host used by `getLoginUrl()`.
- `VITE_OAUTH_SERVER_URL` - fallback OAuth host used by `getLoginUrl()` if `VITE_OAUTH_PORTAL_URL` is missing.
- `VITE_SUPABASE_ANON_KEY` - optional Supabase anon key used by the client login redirect when required.
- `VITE_ANALYTICS_ENDPOINT` - optional analytics endpoint.
- `VITE_ANALYTICS_WEBSITE_ID` - optional analytics website ID.

### Server runtime variables
- `OAUTH_SERVER_URL` - backend OAuth service URL used by `server/_core/sdk.ts`.
- `SUPABASE_ANON_KEY` - Supabase anon key used by backend service requests.
- `JWT_SECRET` - cookie signing secret.
- `DATABASE_URL` - database connection string.
- `OWNER_OPEN_ID` - optional owner OpenID.
- `BUILT_IN_FORGE_API_URL` - optional Forge API URL.
- `BUILT_IN_FORGE_API_KEY` - optional Forge API key.
- `NODE_ENV=production` for production runtime.

## Important notes
- The current application code expects the OAuth login flow to use a valid OAuth portal host, not a Supabase REST path such as `/rest/v1/app-auth`.
- The existing `OAUTH_SERVER_URL` should point to the OAuth service endpoint used for token exchange, not to Supabase REST data endpoints.
- If `VITE_OAUTH_PORTAL_URL` is missing during build, the login redirect falls back to `/`, and login will fail.

## Deployment details
- Vercel project ID: `prj_fyeK6uhEhoeUafcjfd8Amcyzft53`
- Vercel org ID: `team_XFzyEf8ZQN5kMuTj5m513IEb`
- `vercel.json` defines the Node and static build targets.
- `deploy.sh` is a helper script that runs `npm run check`, commits changes, and pushes the branch.

## Recommended next steps
1. Log in to Vercel CLI:
   - `npx vercel login`
2. Verify or set required variables in Vercel project settings:
   - `VITE_APP_ID`
   - `VITE_OAUTH_PORTAL_URL` or `VITE_OAUTH_SERVER_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `OAUTH_SERVER_URL`
   - `SUPABASE_ANON_KEY`
3. Trigger deployment:
   - `npx vercel deploy --prod --yes`
   - or use `./deploy.sh` if you prefer GitHub push based deployment.

## Local config
- `.env.local` is used for local development only.
- `.env` may contain development-specific values and should not be relied on for production.

## Known issue
- The production login URL currently seen in the browser is using `https://<project>.supabase.co/rest/v1/app-auth`, which is incorrect for the OAuth flow.
- The correct OAuth portal host must be configured and deployed so that the login redirect is generated properly and receives the required `apikey` if needed.
