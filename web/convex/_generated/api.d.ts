/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";
import type { GenericId as Id } from "convex/values";

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: {
  ai: {
    chat: FunctionReference<
      "action",
      "public",
      { context?: string; systemPrompt: string; userMessage: string },
      string
    >;
    embed: FunctionReference<
      "action",
      "public",
      { text: string },
      Array<number>
    >;
    transcribe: FunctionReference<
      "action",
      "public",
      { audioBase64: string },
      string
    >;
  };
  conversations: {
    create: FunctionReference<
      "mutation",
      "public",
      { projectId: Id<"projects">; title?: string },
      Id<"conversations">
    >;
    listByProject: FunctionReference<
      "query",
      "public",
      { projectId: Id<"projects"> },
      Array<{
        _creationTime: number;
        _id: Id<"conversations">;
        projectId: Id<"projects">;
        title?: string;
      }>
    >;
  };
  messages: {
    addAssistant: FunctionReference<
      "mutation",
      "public",
      {
        content: string;
        conversationId: Id<"conversations">;
        sources?: Array<{
          quote: string;
          timestamp?: string;
          transcriptionId: Id<"transcriptions">;
        }>;
      },
      Id<"messages">
    >;
    listByConversation: FunctionReference<
      "query",
      "public",
      { conversationId: Id<"conversations"> },
      Array<{
        _creationTime: number;
        _id: Id<"messages">;
        content: string;
        conversationId: Id<"conversations">;
        role: "user" | "assistant";
        sources?: Array<{
          quote: string;
          timestamp?: string;
          transcriptionId: Id<"transcriptions">;
        }>;
      }>
    >;
    send: FunctionReference<
      "mutation",
      "public",
      { content: string; conversationId: Id<"conversations"> },
      Id<"messages">
    >;
  };
  projects: {
    archive: FunctionReference<
      "mutation",
      "public",
      { projectId: Id<"projects"> },
      null
    >;
    create: FunctionReference<
      "mutation",
      "public",
      { description?: string; name: string; userId: string },
      Id<"projects">
    >;
    get: FunctionReference<
      "query",
      "public",
      { projectId: Id<"projects"> },
      {
        _creationTime: number;
        _id: Id<"projects">;
        archived: boolean;
        description?: string;
        name: string;
        userId: string;
      } | null
    >;
    list: FunctionReference<
      "query",
      "public",
      { userId: string },
      Array<{
        _creationTime: number;
        _id: Id<"projects">;
        archived: boolean;
        description?: string;
        name: string;
        userId: string;
      }>
    >;
  };
  rag: {
    indexTranscription: FunctionReference<
      "action",
      "public",
      { transcriptionId: Id<"transcriptions"> },
      number
    >;
    search: FunctionReference<
      "action",
      "public",
      { projectId: Id<"projects">; query: string; topK?: number },
      Array<{
        chunkText: string;
        score: number;
        transcriptionId: Id<"transcriptions">;
      }>
    >;
  };
  transcriptions: {
    create: FunctionReference<
      "mutation",
      "public",
      {
        content: string;
        durationSeconds?: number;
        projectId: Id<"projects">;
        title?: string;
      },
      Id<"transcriptions">
    >;
    get: FunctionReference<
      "query",
      "public",
      { transcriptionId: Id<"transcriptions"> },
      {
        _creationTime: number;
        _id: Id<"transcriptions">;
        blockchainTxHash?: string;
        blockchainVerified: boolean;
        content: string;
        durationSeconds?: number;
        projectId: Id<"projects">;
        title?: string;
      } | null
    >;
    listByProject: FunctionReference<
      "query",
      "public",
      { projectId: Id<"projects"> },
      Array<{
        _creationTime: number;
        _id: Id<"transcriptions">;
        blockchainTxHash?: string;
        blockchainVerified: boolean;
        content: string;
        durationSeconds?: number;
        projectId: Id<"projects">;
        title?: string;
      }>
    >;
  };
  waitlist: {
    count: FunctionReference<"query", "public", {}, number>;
    join: FunctionReference<
      "mutation",
      "public",
      { email: string; source?: string },
      "ok" | "exists"
    >;
  };
};

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: {
  ragHelpers: {
    deleteEmbeddingsForTranscription: FunctionReference<
      "mutation",
      "internal",
      { transcriptionId: Id<"transcriptions"> },
      any
    >;
    getChunksByIds: FunctionReference<
      "query",
      "internal",
      { ids: Array<Id<"embeddings">> },
      any
    >;
    getTranscriptionContent: FunctionReference<
      "query",
      "internal",
      { transcriptionId: Id<"transcriptions"> },
      any
    >;
    insertEmbedding: FunctionReference<
      "mutation",
      "internal",
      {
        chunkIndex: number;
        chunkText: string;
        embedding: Array<number>;
        transcriptionId: Id<"transcriptions">;
      },
      any
    >;
  };
};

export declare const components: {};
