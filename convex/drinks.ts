// convex/drinks.ts
import { v } from "convex/values";
import { query } from "./_generated/server";

// Get all drinks
export const getAllDrinks = query({
  handler: async (ctx) => {
    return await ctx.db.query("drinks").collect();
  },
});

// Get drinks by category
export const getDrinksByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("drinks")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
  },
});

// Get drinks by temperature
export const getDrinksByTemperature = query({
  args: { temperature: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("drinks")
      .withIndex("by_temperature", (q) => q.eq("temperature", args.temperature))
      .collect();
  },
});

// Get drinks by caffeine level
export const getDrinksByCaffeineLevel = query({
  args: { caffeineLevel: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("drinks")
      .withIndex("by_caffeineLevel", (q) => q.eq("caffeineLevel", args.caffeineLevel))
      .collect();
  },
});

// Get vegan drinks
export const getVeganDrinks = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("drinks")
      .withIndex("by_vegan", (q) => q.eq("vegan", true))
      .collect();
  },
});

// Get drink by ID
export const getDrinkById = query({
  args: { drinkId: v.id("drinks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.drinkId);
  },
});

// Search drinks by name
export const searchDrinksByName = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const allDrinks = await ctx.db.query("drinks").collect();
    const searchLower = args.searchTerm.toLowerCase();
    
    return allDrinks.filter(
      (drink) =>
        drink.name.toLowerCase().includes(searchLower) ||
        drink.nameArabic.includes(args.searchTerm)
    );
  },
});

// Get drinks by mood
export const getDrinksByMood = query({
  args: { mood: v.string() },
  handler: async (ctx, args) => {
    const allDrinks = await ctx.db.query("drinks").collect();
    
    return allDrinks.filter((drink) =>
      drink.bestForMoods.includes(args.mood)
    );
  },
});

// Get drinks by weather
export const getDrinksByWeather = query({
  args: { weather: v.string() },
  handler: async (ctx, args) => {
    const allDrinks = await ctx.db.query("drinks").collect();
    
    return allDrinks.filter((drink) =>
      drink.bestForWeather.includes(args.weather)
    );
  },
});

// Get drinks by time of day
export const getDrinksByTimeOfDay = query({
  args: { timeOfDay: v.string() },
  handler: async (ctx, args) => {
    const allDrinks = await ctx.db.query("drinks").collect();
    
    return allDrinks.filter((drink) =>
      drink.bestTimeOfDay.includes(args.timeOfDay)
    );
  },
});

// Get seasonal drinks
export const getSeasonalDrinks = query({
  handler: async (ctx) => {
    const allDrinks = await ctx.db.query("drinks").collect();
    
    return allDrinks.filter((drink) => drink.seasonal === true);
  },
});

// Get drink statistics
export const getDrinkStats = query({
  handler: async (ctx) => {
    const allDrinks = await ctx.db.query("drinks").collect();
    
    return {
      total: allDrinks.length,
      vegan: allDrinks.filter(d => d.vegan).length,
      vegetarian: allDrinks.filter(d => d.vegetarian).length,
      seasonal: allDrinks.filter(d => d.seasonal).length,
      byCategory: allDrinks.reduce((acc, drink) => {
        acc[drink.category] = (acc[drink.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byTemperature: allDrinks.reduce((acc, drink) => {
        acc[drink.temperature] = (acc[drink.temperature] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byCaffeineLevel: allDrinks.reduce((acc, drink) => {
        const level = drink.caffeineLevel || 'unknown';
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  },
});