// convex/users.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get or create user when they sign in/up
export const getOrCreateUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    userName: v.string(),
    authMethod: v.string(), // "google" or "email"
    hasPassword: v.boolean(),
    image: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingUser) {
      // Update existing user data (in case email or name changed in Clerk)
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        userName: args.userName,
        image: args.image,
        authMethod: args.authMethod,
        hasPassword: args.hasPassword,
        updatedAt: Date.now(),
      });
      return existingUser._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      userName: args.userName,
      image: args.image,
      authMethod: args.authMethod,
      hasPassword: args.hasPassword,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

// Get current user by Clerk ID
export const getCurrentUser = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    return user;
  },
});

// Update user profile (name and/or image)
export const updateUserProfile = mutation({
  args: {
    clerkId: v.string(),
    userName: v.optional(v.string()),
    image: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.userName !== undefined) {
      updates.userName = args.userName;
    }

    if (args.image !== undefined) {
      updates.image = args.image;
    }

    await ctx.db.patch(user._id, updates);

    return user._id;
  },
});

// Get user by email
export const getUserByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    return user;
  },
});

// Delete user account
export const deleteUser = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.delete(user._id);
    return { success: true };
  },
});

// Get all users (for debugging)
export const getAllUsers = query({
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});