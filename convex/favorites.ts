// convex/favorites.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Toggle favorite status for a drink
export const toggleFavorite = mutation({
  args: {
    userId: v.string(),
    drinkId: v.id("drinks"),
  },
  handler: async (ctx, args) => {
    // Check if already favorited
    const existing = await ctx.db
      .query("recommendations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.eq(q.field("drinkId"), args.drinkId),
          q.eq(q.field("interactionType"), "favorited")
        )
      )
      .first();

    if (existing) {
      // Remove from favorites
      await ctx.db.delete(existing._id);
      return { favorited: false };
    } else {
      // Add to favorites
      await ctx.db.insert("recommendations", {
        userId: args.userId,
        drinkId: args.drinkId,
        context: {
          mood: "",
          temperature: 0,
          weatherCondition: "",
          timeOfDay: "",
        },
        interactionType: "favorited",
        timestamp: Date.now(),
      });
      return { favorited: true };
    }
  },
});

// Get all favorited drinks for a user
export const getUserFavorites = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query("recommendations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("interactionType"), "favorited"))
      .collect();

    // Get drink details for each favorite
    const favoritesWithDrinks = await Promise.all(
      favorites.map(async (fav) => {
        const drink = await ctx.db.get(fav.drinkId);
        return {
          ...fav,
          drink,
        };
      })
    );

    return favoritesWithDrinks.filter((f) => f.drink !== null);
  },
});

// Check if a drink is favorited
export const isFavorited = query({
  args: {
    userId: v.string(),
    drinkId: v.id("drinks"),
  },
  handler: async (ctx, args) => {
    const favorite = await ctx.db
      .query("recommendations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.eq(q.field("drinkId"), args.drinkId),
          q.eq(q.field("interactionType"), "favorited")
        )
      )
      .first();

    return favorite !== null;
  },
});

// Get favorite status for multiple drinks at once (more efficient)
export const getFavoriteStatuses = query({
  args: {
    userId: v.string(),
    drinkIds: v.array(v.id("drinks")),
  },
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query("recommendations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("interactionType"), "favorited"))
      .collect();

    // Create a map of drinkId -> isFavorited
    const favoriteMap: Record<string, boolean> = {};
    args.drinkIds.forEach((id) => {
      favoriteMap[id] = favorites.some((f) => f.drinkId === id);
    });

    return favoriteMap;
  },
});