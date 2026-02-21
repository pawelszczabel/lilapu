/* eslint-disable */
/**
 * Generated data model types.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  DocumentByName,
  TableNamesInDataModel,
  SystemTableNames,
  AnyDataModel,
} from "convex/server";
import type { GenericId } from "convex/values";

/**
 * A type describing your Convex data model.
 *
 * This type includes information about what tables you have, the type of
 * documents stored in those tables, and the indexes defined on them.
 *
 * This type is used to parameterize methods like `queryGeneric` and
 * `mutationGeneric` to make them type-safe.
 */

export type DataModel = {
  conversations: {
    document: {
      projectId: Id<"projects">;
      title?: string;
      _id: Id<"conversations">;
      _creationTime: number;
    };
    fieldPaths: "_creationTime" | "_id" | "projectId" | "title";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_projectId: ["projectId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  embeddings: {
    document: {
      chunkIndex: number;
      chunkText: string;
      embedding: Array<number>;
      transcriptionId: Id<"transcriptions">;
      _id: Id<"embeddings">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "chunkIndex"
      | "chunkText"
      | "embedding"
      | "transcriptionId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_transcriptionId: ["transcriptionId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {
      by_embedding: {
        vectorField: "embedding";
        dimensions: number;
        filterFields: never;
      };
    };
  };
  messages: {
    document: {
      content: string;
      conversationId: Id<"conversations">;
      role: "user" | "assistant";
      sources?: Array<{
        quote: string;
        timestamp?: string;
        transcriptionId: Id<"transcriptions">;
      }>;
      _id: Id<"messages">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "content"
      | "conversationId"
      | "role"
      | "sources";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_conversationId: ["conversationId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  projects: {
    document: {
      archived: boolean;
      description?: string;
      name: string;
      userId: string;
      _id: Id<"projects">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "archived"
      | "description"
      | "name"
      | "userId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_userId: ["userId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  transcriptions: {
    document: {
      blockchainTxHash?: string;
      blockchainVerified: boolean;
      content: string;
      durationSeconds?: number;
      projectId: Id<"projects">;
      title?: string;
      _id: Id<"transcriptions">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "blockchainTxHash"
      | "blockchainVerified"
      | "content"
      | "durationSeconds"
      | "projectId"
      | "title";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_projectId: ["projectId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  waitlist: {
    document: {
      email: string;
      source?: string;
      _id: Id<"waitlist">;
      _creationTime: number;
    };
    fieldPaths: "_creationTime" | "_id" | "email" | "source";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_email: ["email", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
};

/**
 * The names of all of your Convex tables.
 */
export type TableNames = TableNamesInDataModel<DataModel>;

/**
 * The type of a document stored in Convex.
 *
 * @typeParam TableName - A string literal type of the table name (like "users").
 */
export type Doc<TableName extends TableNames> = DocumentByName<
  DataModel,
  TableName
>;

/**
 * An identifier for a document in Convex.
 *
 * Convex documents are uniquely identified by their `Id`, which is accessible
 * on the `_id` field. To learn more, see [Document IDs](https://docs.convex.dev/using/document-ids).
 *
 * Documents can be loaded using `db.get(tableName, id)` in query and mutation functions.
 *
 * IDs are just strings at runtime, but this type can be used to distinguish them from other
 * strings when type checking.
 *
 * @typeParam TableName - A string literal type of the table name (like "users").
 */
export type Id<TableName extends TableNames | SystemTableNames> =
  GenericId<TableName>;
