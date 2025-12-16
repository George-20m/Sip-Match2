const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

app.post('/api/v1/recommend', (req, res) => {
  console.log('📥 Received request from app:');
  console.log(JSON.stringify(req.body, null, 2));

  res.json({
    success: true,
    user_id: req.body.user_id,
    recommended_drink: {
      name: "Iced Caramel Latte",
      category: "coffee",
      description: `Perfect for your ${req.body.mood} mood!`,
      temperature: "cold",
      ingredients: ["espresso", "milk", "caramel syrup", "ice"]
    },
    confidence_score: 0.89,
    reasoning: `Based on ${req.body.mood} mood and ${req.body.weather.temperature}°C weather`,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Mock server running on http://localhost:${PORT}`);
});