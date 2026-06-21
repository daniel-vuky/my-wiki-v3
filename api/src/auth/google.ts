export function buildAuthUrl(o: { clientId: string; redirectUri: string; state: string }): string {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", o.clientId);
  u.searchParams.set("redirect_uri", o.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "openid email profile");
  u.searchParams.set("state", o.state);
  return u.toString();
}

export interface GoogleProfile { sub: string; email: string; name: string; picture?: string }

export async function exchangeCode(o: {
  code: string; clientId: string; clientSecret: string; redirectUri: string;
}): Promise<GoogleProfile> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: o.code, client_id: o.clientId, client_secret: o.clientSecret,
      redirect_uri: o.redirectUri, grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) throw new Error("token exchange failed");
  const { access_token } = await tokenRes.json() as { access_token: string };
  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!infoRes.ok) throw new Error("userinfo failed");
  return await infoRes.json() as GoogleProfile;
}
