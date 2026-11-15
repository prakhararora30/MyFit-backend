# MyFits Backend API 👔👖

Node.js, Express, and MongoDB backend for the **MyFits** AI Wardrobe & Outfit Recommendation App.

## Features
- **Wardrobe CRUD**: Multi-photo uploads, size tracking, and category filtering (shirts, tshirts, jackets, jeans, shoes, belts).
- **AI Stylist Engine**: Uses Gemini AI & Fashion Color Theory to generate 5 to 7 coordinated outfits.
- **Mannequin Compositor**: Dynamically merges 1 top + 1 jacket + 1 jeans + 1 shoes onto a mannequin visual.

## Render Deployment Settings
- **Environment**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `PORT`: `10000` (set automatically by Render)
  - `MONGODB_URI`: `<Your MongoDB Atlas Connection String>`
  - `GEMINI_API_KEY`: `<Your Gemini API Key>`
