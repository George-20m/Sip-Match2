// convex/recommendations.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Save a recommendation interaction
export const saveRecommendation = mutation({
  args: {
    userId: v.string(),
    drinkId: v.id("drinks"),
    context: v.object({
      mood: v.string(),
      temperature: v.number(),
      weatherCondition: v.string(),
      timeOfDay: v.string(),
      song: v.optional(v.string()),
    }),
    interactionType: v.string(), // "viewed", "ordered", "skipped", "favorited"
    rating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const recommendationId = await ctx.db.insert("recommendations", {
      userId: args.userId,
      drinkId: args.drinkId,
      context: {
        mood: args.context.mood,
        temperature: args.context.temperature,
        weatherCondition: args.context.weatherCondition,
        timeOfDay: args.context.timeOfDay,
      },
      interactionType: args.interactionType,
      rating: args.rating,
      timestamp: Date.now(),
    });

    return recommendationId;
  },
});

// Save a batch of recommendations (for when user gets 5 recommendations)
export const saveRecommendationBatch = mutation({
  args: {
    userId: v.string(),
    drinkIds: v.array(v.id("drinks")),
    context: v.object({
      mood: v.string(),
      temperature: v.number(),
      weatherCondition: v.string(),
      timeOfDay: v.string(),
      song: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const recommendationIds = [];

    for (const drinkId of args.drinkIds) {
      const id = await ctx.db.insert("recommendations", {
        userId: args.userId,
        drinkId: drinkId,
        context: {
          mood: args.context.mood,
          temperature: args.context.temperature,
          weatherCondition: args.context.weatherCondition,
          timeOfDay: args.context.timeOfDay,
        },
        interactionType: "viewed",
        timestamp: Date.now(),
      });
      recommendationIds.push(id);
    }

    return recommendationIds;
  },
});

// Get user's recommendation history
export const getUserHistory = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const recommendations = await ctx.db
      .query("recommendations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    // Get drink details for each recommendation
    const historyWithDrinks = await Promise.all(
      recommendations.map(async (rec) => {
        const drink = await ctx.db.get(rec.drinkId);
        return {
          ...rec,
          drink,
        };
      })
    );

    return historyWithDrinks;
  },
});

// Get grouped history (group by timestamp/session)
export const getUserHistoryGrouped = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const recommendations = await ctx.db
      .query("recommendations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    // Group recommendations by timestamp (within 1 minute = same session)
    const grouped: Map<number, typeof recommendations> = new Map();
    
    recommendations.forEach((rec) => {
      // Round to nearest minute
      const sessionKey = Math.floor(rec.timestamp / 60000) * 60000;
      
      if (!grouped.has(sessionKey)) {
        grouped.set(sessionKey, []);
      }
      grouped.get(sessionKey)!.push(rec);
    });

    // Convert to array and get drink details
    const sessions = await Promise.all(
      Array.from(grouped.entries()).map(async ([timestamp, recs]) => {
        const drinksWithDetails = await Promise.all(
          recs.map(async (rec) => {
            const drink = await ctx.db.get(rec.drinkId);
            return {
              ...rec,
              drink,
            };
          })
        );

        return {
          timestamp,
          context: recs[0].context, // All have same context in a session
          recommendations: drinksWithDetails,
        };
      })
    );

    return sessions;
  },
});

// Get user's favorite drinks (based on ratings)
export const getUserFavorites = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const recommendations = await ctx.db
      .query("recommendations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("rating"), 4)) // 4 or 5 stars
      .order("desc")
      .collect();

    const favoritesWithDrinks = await Promise.all(
      recommendations.map(async (rec) => {
        const drink = await ctx.db.get(rec.drinkId);
        return {
          ...rec,
          drink,
        };
      })
    );

    return favoritesWithDrinks;
  },
});

// Update recommendation rating
export const updateRating = mutation({
  args: {
    recommendationId: v.id("recommendations"),
    rating: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.recommendationId, {
      rating: args.rating,
    });
  },
});