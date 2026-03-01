/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as autumnCheckout from "../autumnCheckout.js";
import type * as autumnWebhook from "../autumnWebhook.js";
import type * as betting from "../betting.js";
import type * as browserUse from "../browserUse.js";
import type * as challenges from "../challenges.js";
import type * as credits from "../credits.js";
import type * as crons from "../crons.js";
import type * as emails from "../emails.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as lemonsqueezy from "../lemonsqueezy.js";
import type * as oddsAssessor from "../oddsAssessor.js";
import type * as oddsHistory from "../oddsHistory.js";
import type * as payments from "../payments.js";
import type * as prompts from "../prompts.js";
import type * as sandboxes from "../sandboxes.js";
import type * as stripeCheckout from "../stripeCheckout.js";
import type * as stripeWebhook from "../stripeWebhook.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  autumnCheckout: typeof autumnCheckout;
  autumnWebhook: typeof autumnWebhook;
  betting: typeof betting;
  browserUse: typeof browserUse;
  challenges: typeof challenges;
  credits: typeof credits;
  crons: typeof crons;
  emails: typeof emails;
  events: typeof events;
  http: typeof http;
  lemonsqueezy: typeof lemonsqueezy;
  oddsAssessor: typeof oddsAssessor;
  oddsHistory: typeof oddsHistory;
  payments: typeof payments;
  prompts: typeof prompts;
  sandboxes: typeof sandboxes;
  stripeCheckout: typeof stripeCheckout;
  stripeWebhook: typeof stripeWebhook;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  browserUse: {
    profiles: {
      create: FunctionReference<
        "action",
        "internal",
        { apiKey: string; name?: string },
        { createdAt: string; id: string; name?: string }
      >;
      deleteProfile: FunctionReference<
        "action",
        "internal",
        { apiKey: string; profileId: string },
        null
      >;
      getProfile: FunctionReference<
        "action",
        "internal",
        { apiKey: string; profileId: string },
        {
          cookieDomains: Array<string>;
          createdAt: string;
          id: string;
          lastUsedAt?: string;
          name?: string;
        }
      >;
      list: FunctionReference<
        "action",
        "internal",
        { apiKey: string },
        Array<{
          cookieDomains: Array<string>;
          createdAt: string;
          id: string;
          lastUsedAt?: string;
          name?: string;
        }>
      >;
      update: FunctionReference<
        "action",
        "internal",
        { apiKey: string; name: string; profileId: string },
        { id: string; name?: string }
      >;
    };
    sessions: {
      create: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          browserScreenHeight?: number;
          browserScreenWidth?: number;
          profileId?: string;
          proxyCountryCode?: string;
          startUrl?: string;
        },
        { externalId: string; liveUrl?: string; sessionId: string }
      >;
      fetchDetail: FunctionReference<
        "action",
        "internal",
        { apiKey: string; externalId: string },
        any
      >;
      get: FunctionReference<"query", "internal", { sessionId: string }, any>;
      list: FunctionReference<
        "query",
        "internal",
        { limit?: number; status?: "active" | "stopped" },
        any
      >;
      stop: FunctionReference<
        "action",
        "internal",
        { apiKey: string; externalId: string },
        null
      >;
    };
    tasks: {
      create: FunctionReference<
        "action",
        "internal",
        {
          allowedDomains?: Array<string>;
          apiKey: string;
          flashMode?: boolean;
          highlightElements?: boolean;
          judge?: boolean;
          judgeGroundTruth?: string;
          judgeLlm?: string;
          llm?: string;
          maxSteps?: number;
          metadata?: any;
          secrets?: any;
          sessionId?: string;
          skillIds?: Array<string>;
          startUrl?: string;
          structuredOutput?: any;
          systemPromptExtension?: string;
          task: string;
          thinking?: boolean;
          vision?: boolean | "auto";
        },
        { externalId: string; sessionId: string; taskId: string }
      >;
      fetchDetail: FunctionReference<
        "action",
        "internal",
        { apiKey: string; externalId: string },
        any
      >;
      fetchStatus: FunctionReference<
        "action",
        "internal",
        { apiKey: string; externalId: string },
        { isSuccess?: boolean; output?: string; status: string }
      >;
      get: FunctionReference<"query", "internal", { taskId: string }, any>;
      getSteps: FunctionReference<"query", "internal", { taskId: string }, any>;
      list: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          sessionId?: string;
          status?:
            | "created"
            | "started"
            | "paused"
            | "finished"
            | "stopped"
            | "failed";
        },
        any
      >;
      stop: FunctionReference<
        "action",
        "internal",
        { apiKey: string; externalId: string },
        null
      >;
    };
  };
};
