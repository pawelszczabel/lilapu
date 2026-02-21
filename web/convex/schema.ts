import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Projekty (klienci / sprawy)
  projects: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    archived: v.boolean(),
  }).index("by_userId", ["userId"]),

  // Transkrypcje (nagrania w projekcie)
  transcriptions: defineTable({
    projectId: v.id("projects"),
    title: v.optional(v.string()),
    content: v.string(),
    durationSeconds: v.optional(v.number()),
    blockchainTxHash: v.optional(v.string()),
    blockchainVerified: v.boolean(),
  }).index("by_projectId", ["projectId"]),

  // Rozmowy z AI (chat history per projekt)
  conversations: defineTable({
    projectId: v.id("projects"),
    title: v.optional(v.string()),
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
    transcriptionId: v.id("transcriptions"),
    chunkText: v.string(),
    chunkIndex: v.number(),
    embedding: v.array(v.float64()),
  })
    .index("by_transcriptionId", ["transcriptionId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 384,
    }),

  // Waitlist (landing page signups)
  waitlist: defineTable({
    email: v.string(),
    source: v.optional(v.string()),
  }).index("by_email", ["email"]),
});
