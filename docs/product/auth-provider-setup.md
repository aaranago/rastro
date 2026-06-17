# Auth Provider Setup

Rastro v1 uses Better Auth. The mobile and web apps must support email/password, Google, Facebook, and Apple on iOS where required for App Store compliance.

## Rastro Auth URLs

Use these callback URLs unless the auth route base path changes:

- Local Google: `http://localhost:3000/api/auth/callback/google`
- Production Google: `https://YOUR_DOMAIN/api/auth/callback/google`
- Local Facebook: `http://localhost:3000/api/auth/callback/facebook`
- Production Facebook: `https://YOUR_DOMAIN/api/auth/callback/facebook`
- Production Apple: `https://YOUR_DOMAIN/api/auth/callback/apple`

Apple Sign in does not support `localhost` or non-HTTPS return URLs. Use a real HTTPS domain for Apple development and production testing.

## Environment Variables

Target variables to add when implementing auth:

```env
AUTH_SECRET=""
BETTER_AUTH_URL="https://YOUR_DOMAIN"

AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""

AUTH_FACEBOOK_ID=""
AUTH_FACEBOOK_SECRET=""

AUTH_APPLE_CLIENT_ID=""
AUTH_APPLE_TEAM_ID=""
AUTH_APPLE_KEY_ID=""
AUTH_APPLE_PRIVATE_KEY=""
AUTH_APPLE_APP_BUNDLE_IDENTIFIER=""
```

Implementation must update `packages/auth/env.ts`, `packages/auth/src/index.ts`, `.env.example`, and the Better Auth schema generation config.

## Email And Password

- Enable Better Auth `emailAndPassword.enabled`.
- Implement password reset before production.
- Email verification is not required by default.
- Keep email verification configurable so admins can require verified email for publishing if spam is detected.
- If verification is enabled, configure email sending before enforcing it.

Source: [Better Auth Email & Password](https://www.better-auth.com/docs/authentication/email-password)

## Google

1. Open Google Cloud Console.
2. Configure the OAuth consent screen for Rastro.
3. Create OAuth client credentials.
4. Add the local and production Google redirect URLs above.
5. Store the Client ID and Client Secret in Rastro env vars.

Sources:

- [Better Auth Google](https://www.better-auth.com/docs/authentication/google)
- [Google OAuth consent screen](https://developers.google.com/workspace/guides/configure-oauth-consent)
- [Google OAuth web server apps](https://developers.google.com/identity/protocols/oauth2/web-server)

## Facebook

1. Open Meta for Developers.
2. Create or select the Rastro app.
3. In App Settings > Basic, copy App ID and App Secret.
4. Configure Facebook Login.
5. Add the local and production Facebook redirect URLs above as valid OAuth redirect URIs.
6. Keep requested permissions minimal: email and public profile.

Sources:

- [Better Auth Facebook](https://better-auth.com/docs/authentication/facebook)
- [Meta strict URI matching](https://developers.facebook.com/blog/post/2017/12/18/strict-uri-matching/)
- [Meta Facebook Login security](https://developers.facebook.com/documentation/facebook-login/security)

## Apple

Apple is required on iOS if Rastro offers Google or Facebook as primary sign-in options.

1. Use an active Apple Developer account.
2. Register the iOS App ID and enable Sign in with Apple.
3. Register a Services ID for web OAuth.
4. Configure domains and the production Apple return URL above.
5. Create and download the private key.
6. Store Team ID, Key ID, Client ID, private key, and bundle identifier in env vars.
7. Generate the Apple client secret JWT in server code, not by pasting a long-lived static secret.

Sources:

- [Better Auth Apple](https://www.better-auth.com/docs/authentication/apple)
- [Apple Sign in with Apple](https://developer.apple.com/documentation/signinwithapple)
- [Apple configure Sign in with Apple for web](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/)
- [Apple App Review Guideline 4.8](https://developer.apple.com/app-store/review/guidelines/)
