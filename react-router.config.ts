import type { Config } from "@react-router/dev/config";

export default {
  // SPA mode: the app is a client-rendered dashboard talking to a separate
  // backend over HTTP. Auth lives in the browser (cookies + localStorage), so
  // there is no server-render step. See architecture.md.
  ssr: false,
} satisfies Config;
