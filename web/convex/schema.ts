import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Foldery / Gabinety (grupujące pacjentów)
  folders: defineTable({
    userId: v.string(),
    name: v.string(),
    archived: v.boolean(),
  }).index("by_userId", ["userId"]),

  // Projekty (klienci / pacjenci)
  projects: defineTable({
    userId: v.string(),
    folderId: v.optional(v.id("folders")),
    name: v.string(),
    description: v.optional(v.string()),
    archived: v.boolean(),
  }).index("by_userId", ["userId"]),

  // Transkrypcje (nagrania w projekcie)
  transcriptions: defineTable({
    projectId: v.id("projects"),
    title: v.optional(v.string()),
    content: v.string(),
    audioStorageId: v.optional(v.id("_storage")),
    durationSeconds: v.optional(v.number()),
    blockchainTxHash: v.optional(v.string()),
    blockchainVerified: v.boolean(),
  }).index("by_projectId", ["projectId"]),

  // Rozmowy z AI (chat history per projekt)
  conversations: defineTable({
    projectId: v.id("projects"),
    title: v.optional(v.string()),
    chatMode: v.optional(
      v.union(v.literal("transcription"), v.literal("project"))
    ),
    scopedTranscriptionIds: v.optional(v.array(v.id("transcriptions"))),
    scopedNoteIds: v.optional(v.array(v.id("notes"))),
    scopedConversationIds: v.optional(v.array(v.id("conversations"))),
  }).index("by_projectId", ["projectId"]),

  // Wiadomości w rozmowie
  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    sources: v.optional(
      v.array(
        v.object({
          transcriptionId: v.id("transcriptions"),
          quote: v.string(),
          timestamp: v.optional(v.string()),
        })
      )
    ),
  }).index("by_conversationId", ["conversationId"]),

  // Embeddingi do RAG (vector search)
  embeddings: defineTable({
    projectId: v.id("projects"),
    transcriptionId: v.id("transcriptions"),
    chunkText: v.string(),
    chunkIndex: v.number(),
    embedding: v.array(v.float64()),
  })
    .index("by_transcriptionId", ["transcriptionId"])
    .index("by_projectId", ["projectId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 384,
      filterFields: ["projectId"],
    }),

  // Notatki per projekt
  notes: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    content: v.string(),
    format: v.optional(v.union(v.literal("md"), v.literal("txt"))),
  }).index("by_projectId", ["projectId"]),

  // Waitlist (landing page signups)
  waitlist: defineTable({
    email: v.string(),
    source: v.optional(v.string()),
  }).index("by_email", ["email"]),
});
