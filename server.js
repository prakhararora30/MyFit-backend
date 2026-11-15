const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const clothRoutes = require('./routes/clothRoutes');
const outfitRoutes = require('./routes/outfitRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/myfits';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploads folder statically so images can be fetched by Android app
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/clothes', clothRoutes);
app.use('/api/outfits', outfitRoutes);

// Root Health Check
app.get('/', (req, res) => {
  res.json({
    app: 'MyFits Backend API',
    status: 'Running',
    version: '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'Connected to MongoDB' : 'Disconnected / Connecting',
    endpoints: {
      clothes: '/api/clothes',
      outfits: '/api/outfits',
      generateOutfits: 'POST /api/outfits/generate',
      seedSampleWardrobe: 'POST /api/clothes/seed',
    },
  });
});

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully:', MONGODB_URI);
  })
  .catch((err) => {
    console.warn('⚠️ MongoDB connection note:', err.message);
    console.log('ℹ️ Ensure MongoDB is running locally (mongod) or configure MONGODB_URI in .env');
  });

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MyFits Server listening on http://0.0.0.0:${PORT}`);
  console.log(`📱 For Android Emulator, access via: http://10.0.2.2:${PORT}`);
});
