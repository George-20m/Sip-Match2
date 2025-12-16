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

  drinks: defineTable({
    // Basic Info
    productCode: v.optional(v.string()),
    name: v.string(),
    nameArabic: v.string(),
    category: v.string(), // "hot_coffee", "cold_coffee", "tea", "lemonade", "ice_tea", "frappe", "refresher", "ice_cream", "alternative_milk", "hot_chocolate", "cold_chocolate", "shaken_coffee"
    subcategory: v.optional(v.string()), // "espresso_based", "latte", "specialty", etc.
    
    // Characteristics
    temperature: v.string(), // "hot", "cold", "frozen", "any"
    caffeineLevel: v.optional(v.string()), // "none", "low", "medium", "high"
    sweetnessLevel: v.optional(v.number()), // 0-10 scale
    
    // Dietary & Allergens
    vegan: v.boolean(),
    vegetarian: v.boolean(),
    allergens: v.object({
      egg: v.boolean(),
      fish: v.boolean(),
      shellfish: v.boolean(),
      milk: v.boolean(),
      peanuts: v.boolean(),
      treeNuts: v.boolean(),
      sesame: v.boolean(),
      celery: v.boolean(),
      mustard: v.boolean(),
      soy: v.boolean(),
      sulphite: v.boolean(),
      wheat: v.boolean(),
      gluten: v.boolean(),
      lupin: v.boolean(),
    }),
    
    // Recommendations
    bestForMoods: v.array(v.string()), // ["happy", "energetic", "calm", "romantic", "focused", "indulgent", "cozy", "comfort", "wellness", etc.]
    bestForWeather: v.array(v.string()), // ["hot", "cold", "rainy", "cloudy", "warm", "cool", "any"]
    bestTimeOfDay: v.array(v.string()), // ["morning", "afternoon", "evening", "night", "any"]
    
    // Flavor Profile
    flavorProfile: v.array(v.string()), // ["sweet", "bitter", "creamy", "fruity", "nutty", "spicy", "chocolate", "caramel", etc.]
    intensity: v.optional(v.number()), // 1-5 scale
    
    // Additional
    seasonal: v.optional(v.boolean()),
    description: v.optional(v.string()),
  })
    .index("by_category", ["category"])
    .index("by_vegan", ["vegan"])
    .index("by_temperature", ["temperature"])
    .index("by_caffeineLevel", ["caffeineLevel"]),
  
  recommendations: defineTable({
    userId: v.string(), // Clerk user ID
    drinkId: v.id("drinks"),
    context: v.object({
      mood: v.string(),
      temperature: v.number(),
      weatherCondition: v.string(),
      timeOfDay: v.string(),
    }),
    interactionType: v.string(), // "viewed", "ordered", "skipped", "favorited"
    rating: v.optional(v.number()), // 1-5 rating
    timestamp: v.number(), // Unix timestamp
  })
    .index("by_user", ["userId"])
    .index("by_drink", ["drinkId"])
    .index("by_timestamp", ["timestamp"]),
});