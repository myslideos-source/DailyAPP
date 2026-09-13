import type { CapacitorConfig } from "@capacitor/cli";

// dayli's native iOS shell. dayli is (and stays) a fully working PWA — this
// config does not change how the web app is built or deployed. It only
// wraps the already-deployed PWA in a thin native WKWebView shell so the
// app can carry a WidgetKit extension, which no PWA can ever host (iOS
// gives home-screen widgets exclusively to native app targets).
//
// `server.url` — not `webDir` — is the actual content source: the native
// shell loads dayli's real, already-hosted production URL, the same
// Supabase-backed app everyone already uses in the browser. This avoids
// forking dayli into a second, statically-exported build that would need
// its own release process and could drift from the PWA. `webDir` still has
// to point at *some* existing folder (Capacitor validates it at build
// time even when server.url is set) — "public" is reused since it already
// exists and needs no separate build step; it is never actually served.
//
// Before shipping: replace the placeholder URL below with dayli's real
// deployed origin (see ios/README.md, step 2).
const config: CapacitorConfig = {
  appId: "com.dayli.app",
  appName: "dayli",
  webDir: "public",
  server: {
    url: "https://REPLACE-WITH-DEPLOYED-DAYLI-URL.example.com",
    // The web app already handles its own theming (dark navy) and PWA
    // service worker; a mixed-content/cleartext exception is deliberately
    // NOT enabled here — dayli's production origin must be https.
    androidScheme: "https",
  },
  ios: {
    // Matches the PWA's own manifest background/theme so the native
    // status bar and launch background don't flash a mismatched color
    // before the web content paints.
    backgroundColor: "#080A13",
  },
};

export default config;
