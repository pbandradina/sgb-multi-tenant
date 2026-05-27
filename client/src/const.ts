export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
// VITE_OAUTH_PORTAL_URL must point to the OAuth portal host, not a Supabase REST API URL.
export const getLoginUrl = () => {
  const oauthPortalUrl =
    import.meta.env.VITE_OAUTH_PORTAL_URL ??
    import.meta.env.VITE_OAUTH_SERVER_URL ??
    import.meta.env.OAUTH_SERVER_URL ??
    "";
  const appId =
    import.meta.env.VITE_APP_ID ?? import.meta.env.APP_ID ?? "";
  const supabaseAnonKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY ??
    import.meta.env.SUPABASE_ANON_KEY ??
    "";
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  if (!oauthPortalUrl) {
    console.error(
      "[Auth] Missing OAuth portal URL. Set VITE_OAUTH_PORTAL_URL, VITE_OAUTH_SERVER_URL, or OAUTH_SERVER_URL in your environment."
    );
    return "/";
  }

  if (oauthPortalUrl.includes("/rest/v1") || oauthPortalUrl.includes("/auth/v1")) {
    console.error(
      "[Auth] Invalid OAuth portal URL. Do not use Supabase REST/auth paths. Use the OAuth portal host instead."
    );
    return "/";
  }

  if (!appId) {
    console.error("[Auth] Missing OAuth app id. Set VITE_APP_ID in your environment.");
    return "/";
  }

  const normalizedUrl = oauthPortalUrl.endsWith("/")
    ? oauthPortalUrl.slice(0, -1)
    : oauthPortalUrl;

  try {
    const url = new URL(`${normalizedUrl}/authorize`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");

    if (supabaseAnonKey) {
      url.searchParams.set("apikey", supabaseAnonKey);
    }

    return url.toString();
  } catch (error) {
    console.error("[Auth] Invalid OAuth portal URL:", oauthPortalUrl, error);
    return "/";
  }
};
