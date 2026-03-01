import { httpRouter } from "convex/server";
import { lemonSqueezyWebhook } from "./lemonsqueezy";

export default httpRouter({
  "/lemonsqueezy-webhook": lemonSqueezyWebhook,
});
