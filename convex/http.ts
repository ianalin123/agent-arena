import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { autumnWebhook } from "./autumnWebhook";
import { lemonSqueezyWebhook } from "./lemonsqueezy";
import { stripeWebhook } from "./stripeWebhook";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/lemonsqueezy-webhook",
  method: "POST",
  handler: lemonSqueezyWebhook,
});

http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: stripeWebhook,
});

http.route({
  path: "/autumn-webhook",
  method: "POST",
  handler: autumnWebhook,
});

export default http;
