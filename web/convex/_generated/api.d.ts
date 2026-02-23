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
    addConversationScope: FunctionReference<
      "mutation",
      "public",
      {
        conversationId: Id<"conversations">;
        targetConversationId: Id<"conversations">;
      },
      null
    >;
    addNoteScope: FunctionReference<
      "mutation",
      "public",
      { conversationId: Id<"conversations">; noteId: Id<"notes"> },
      null
    >;
    addTranscriptionScope: FunctionReference<
      "mutation",
      "public",
      {
        conversationId: Id<"conversations">;
        transcriptionId: Id<"transcriptions">;
      },
      null
    >;
    create: FunctionReference<
      "mutation",
      "public",
      {
        chatMode?: "transcription" | "project";
        projectId: Id<"projects">;
        scopedTranscriptionIds?: Array<Id<"transcriptions">>;
        title?: string;
      },
      Id<"conversations">
    >;
    get: FunctionReference<
      "query",
      "public",
      { conversationId: Id<"conversations"> },
      {
        _creationTime: number;
        _id: Id<"conversations">;
        chatMode?: "transcription" | "project";
        projectId: Id<"projects">;
        scopedConversationIds?: Array<Id<"conversations">>;
        scopedNoteIds?: Array<Id<"notes">>;
        scopedTranscriptionIds?: Array<Id<"transcriptions">>;
        title?: string;
      } | null
    >;
    listByProject: FunctionReference<
      "query",
      "public",
      { projectId: Id<"projects"> },
      Array<{
        _creationTime: number;
        _id: Id<"conversations">;
        chatMode?: "transcription" | "project";
        projectId: Id<"projects">;
        scopedConversationIds?: Array<Id<"conversations">>;
        scopedNoteIds?: Array<Id<"notes">>;
        scopedTranscriptionIds?: Array<Id<"transcriptions">>;
        title?: string;
      }>
    >;
    listByTranscription: FunctionReference<
      "query",
      "public",
      { transcriptionId: Id<"transcriptions"> },
      Array<{
        _creationTime: number;
        _id: Id<"conversations">;
        chatMode?: "transcription" | "project";
        projectId: Id<"projects">;
        scopedConversationIds?: Array<Id<"conversations">>;
        scopedNoteIds?: Array<Id<"notes">>;
        scopedTranscriptionIds?: Array<Id<"transcriptions">>;
        title?: string;
      }>
    >;
  };
  folders: {
    archive: FunctionReference<
      "mutation",
      "public",
      { folderId: Id<"folders"> },
      null
    >;
    create: FunctionReference<
      "mutation",
      "public",
      { name: string; userId: string },
      Id<"folders">
    >;
    list: FunctionReference<
      "query",
      "public",
      { userId: string },
      Array<{
        _creationTime: number;
        _id: Id<"folders">;
        archived: boolean;
        name: string;
        userId: string;
      }>
    >;
    update: FunctionReference<
      "mutation",
      "public",
      { folderId: Id<"folders">; name: string },
      null
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
    listByConversations: FunctionReference<
      "query",
      "public",
      { conversationIds: Array<Id<"conversations">> },
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
  notes: {
    create: FunctionReference<
      "mutation",
      "public",
      {
        content: string;
        format?: "md" | "txt";
        projectId: Id<"projects">;
        title: string;
      },
      Id<"notes">
    >;
    get: FunctionReference<
      "query",
      "public",
      { noteId: Id<"notes"> },
      {
        _creationTime: number;
        _id: Id<"notes">;
        content: string;
        format?: "md" | "txt";
        projectId: Id<"projects">;
        title: string;
      } | null
    >;
    listByProject: FunctionReference<
      "query",
      "public",
      { projectId: Id<"projects"> },
      Array<{
        _creationTime: number;
        _id: Id<"notes">;
        content: string;
        format?: "md" | "txt";
        projectId: Id<"projects">;
        title: string;
      }>
    >;
    remove: FunctionReference<
      "mutation",
      "public",
      { noteId: Id<"notes"> },
      null
    >;
    update: FunctionReference<
      "mutation",
      "public",
      { content?: string; noteId: Id<"notes">; title?: string },
      null
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
      {
        description?: string;
        folderId?: Id<"folders">;
        name: string;
        userId: string;
      },
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
        folderId?: Id<"folders">;
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
        folderId?: Id<"folders">;
        name: string;
        userId: string;
      }>
    >;
    update: FunctionReference<
      "mutation",
      "public",
      {
        description?: string;
        folderId?: Id<"folders"> | null;
        name?: string;
        projectId: Id<"projects">;
      },
      null
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
        transcriptionTitle: string;
      }>
    >;
    searchByTranscriptions: FunctionReference<
      "action",
      "public",
      {
        projectId: Id<"projects">;
        query: string;
        topK?: number;
        transcriptionIds: Array<Id<"transcriptions">>;
      },
      Array<{
        chunkText: string;
        score: number;
        transcriptionId: Id<"transcriptions">;
        transcriptionTitle: string;
      }>
    >;
  };
  transcriptions: {
    create: FunctionReference<
      "mutation",
      "public",
      {
        audioStorageId?: Id<"_storage">;
        content: string;
        contentWithSpeakers?: string;
        durationSeconds?: number;
        projectId: Id<"projects">;
        speakerCount?: number;
        title?: string;
      },
      Id<"transcriptions">
    >;
    generateUploadUrl: FunctionReference<"mutation", "public", any, any>;
    get: FunctionReference<
      "query",
      "public",
      { transcriptionId: Id<"transcriptions"> },
      {
        _creationTime: number;
        _id: Id<"transcriptions">;
        audioStorageId?: Id<"_storage">;
        blockchainTxHash?: string;
        blockchainVerified: boolean;
        content: string;
        contentWithSpeakers?: string;
        durationSeconds?: number;
        projectId: Id<"projects">;
        speakerCount?: number;
        title?: string;
      } | null
    >;
    getAudioUrl: FunctionReference<
      "query",
      "public",
      { storageId: Id<"_storage"> },
      string | null
    >;
    listByProject: FunctionReference<
      "query",
      "public",
      { projectId: Id<"projects"> },
      Array<{
        _creationTime: number;
        _id: Id<"transcriptions">;
        audioStorageId?: Id<"_storage">;
        blockchainTxHash?: string;
        blockchainVerified: boolean;
        content: string;
        contentWithSpeakers?: string;
        durationSeconds?: number;
        projectId: Id<"projects">;
        speakerCount?: number;
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
    getTranscriptionProjectId: FunctionReference<
      "query",
      "internal",
      { transcriptionId: Id<"transcriptions"> },
      any
    >;
    getTranscriptionTitles: FunctionReference<
      "query",
      "internal",
      { ids: Array<Id<"transcriptions">> },
      any
    >;
    insertEmbedding: FunctionReference<
      "mutation",
      "internal",
      {
        chunkIndex: number;
        chunkText: string;
        embedding: Array<number>;
        projectId: Id<"projects">;
        transcriptionId: Id<"transcriptions">;
      },
      any
    >;
  };
};

export declare const components: {};
