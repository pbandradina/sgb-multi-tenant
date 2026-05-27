export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
// VITE_OAUTH_PORTAL_URL must point to the Supabase project URL ONLY.
// Example:
// https://xxxxxxxx.supabase.co
export const getLoginUrl = () => {
  const oauthPortalUrl =
    import.meta.env.VITE_OAUTH_PORTAL_URL ??
    import.meta.env.VITE_OAUTH_SERVER_URL ??
    import.meta.env.OAUTH_SERVER_URL ??
    "";

  const appId =
    import.meta.env.VITE_APP_ID ??
    import.meta.env.APP_ID ??
    "";

  const supabaseAnonKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY ??
    import.meta.env.SUPABASE_ANON_KEY ??
    "";

  const redirectUri = `${window.location.origin}/api/oauth/callback`;

  const state = btoa(redirectUri);

  // Validações
  if (!oauthPortalUrl) {
    console.error(
      "[Auth] Missing OAuth portal URL. Configure VITE_OAUTH_PORTAL_URL."
    );
    return "/";
  }

  if (!appId) {
    console.error(
      "[Auth] Missing OAuth app id. Configure VITE_APP_ID."
    );
    return "/";
  }

  if (!supabaseAnonKey) {
    console.error(
      "[Auth] Missing Supabase anon key. Configure VITE_SUPABASE_ANON_KEY."
    );
    return "/";
  }

  // Remove barra final
  const normalizedUrl = oauthPortalUrl.endsWith("/")
    ? oauthPortalUrl.slice(0, -1)
    : oauthPortalUrl;

  try {
    // Endpoint CORRETO do Supabase OAuth
    const url = new URL(
      `${normalizedUrl}/auth/v1/authorize`
    );

    // Provider obrigatório
    url.searchParams.set("provider", "google");

    // Parâmetros adicionais
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectTo", redirectUri);
    url.searchParams.set("state", state);

    // API key
    url.searchParams.set("apikey", supabaseAnonKey);

    return url.toString();
  } catch (error) {
    console.error(
      "[Auth] Invalid OAuth portal URL:",
      oauthPortalUrl,
      error
    );

    return "/";
  }
};