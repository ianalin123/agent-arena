import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { lemonSqueezyWebhook } from "./lemonsqueezy";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/lemonsqueezy-webhook",
  method: "POST",
  handler: lemonSqueezyWebhook,
});

export default http;
