// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    // Clerk user ID - primary identifier
    clerkId: v.string(),
    
    // User details
    userName: v.string(),
    email: v.string(),
    
    // Image can be URL or null (will show initial letter if null)
    image: v.union(v.string(), v.null()),
    
    // Auth method: "google" or "email"
    authMethod: v.string(),
    
    // Only present for email auth users
    hasPassword: v.boolean(),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"]),
});