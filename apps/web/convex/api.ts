/**
 * Local API reference for the Convex backend.
 * Uses anyApi until the project is deployed and `npx convex dev` generates real types.
 * Once generated, replace this with: export { api } from "../../../convex/_generated/api";
 */
import { anyApi } from "convex/server";

export const api = anyApi;
