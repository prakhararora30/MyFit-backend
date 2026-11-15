const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Cloth = require('../models/Cloth');

// Multer storage for multi-image uploads (2-3 photos per item)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'cloth-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
});

/**
 * GET /api/clothes
 * Real-time fetch of all clothes or filtered by category (shirts, tshirts, jackets, jeans, shoes, belts)
 */
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = {};

    if (category && category !== 'all') {
      filter.category = category.toLowerCase();
    }

    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    const clothes = await Cloth.find(filter).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: clothes.length,
      data: clothes,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/clothes/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const item = await Cloth.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/clothes
 * Add new cloth: accepts 1-5 files (2-3 recommended) + category, size, title, color
 */
router.post('/', upload.array('photos', 5), async (req, res) => {
  try {
    const { title, category, size, dominantColor, brand, vibe } = req.body;

    if (!title || !category || !size) {
      return res.status(400).json({
        success: false,
        message: 'Title, category, and size are required fields.',
      });
    }

    // Process uploaded file paths
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map((f) => `/uploads/${f.filename}`);
    } else if (req.body.imageUrls) {
      // Support JSON payload with pre-existing URLs
      imageUrls = Array.isArray(req.body.imageUrls) ? req.body.imageUrls : [req.body.imageUrls];
    } else {
      // Default placeholder if testing without files
      imageUrls = [`/uploads/default-${category}.svg`];
    }

    const newItem = new Cloth({
      title,
      category: category.toLowerCase(),
      size: size.toUpperCase(),
      images: imageUrls,
      cleanImageUrl: imageUrls[0] || '',
      dominantColor: dominantColor || 'Unknown',
      brand: brand || '',
      vibe: vibe || 'Casual',
    });

    await newItem.save();

    res.status(201).json({
      success: true,
      message: 'Item added successfully to your wardrobe',
      data: newItem,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/clothes/:id
 * Remove cloth item from database and delete local files
 */
router.delete('/:id', async (req, res) => {
  try {
    const item = await Cloth.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Delete image files from disk if local
    if (item.images && Array.isArray(item.images)) {
      item.images.forEach((imgUrl) => {
        if (imgUrl.startsWith('/uploads/')) {
          const localPath = path.join(__dirname, '..', imgUrl);
          if (fs.existsSync(localPath)) {
            try {
              fs.unlinkSync(localPath);
            } catch (e) {
              console.warn('Could not delete image file:', localPath);
            }
          }
        }
      });
    }

    await Cloth.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Item removed successfully from your wardrobe',
      deletedId: req.params.id,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/clothes/seed
 * Populates sample clothes across all categories to get started quickly
 */
router.post('/seed', async (req, res) => {
  try {
    const sampleClothes = [
      {
        title: 'Denim Trucker Jacket',
        category: 'jackets',
        size: 'L',
        dominantColor: 'navy',
        images: ['/uploads/sample-jacket.svg'],
        cleanImageUrl: '/uploads/sample-jacket.svg',
        brand: 'Levi',
      },
      {
        title: 'Oxford Button-Down Shirt',
        category: 'shirts',
        size: 'M',
        dominantColor: 'white',
        images: ['/uploads/sample-shirt.svg'],
        cleanImageUrl: '/uploads/sample-shirt.svg',
        brand: 'Ralph Lauren',
      },
      {
        title: 'Heavyweight Boxy Tee',
        category: 'tshirts',
        size: 'L',
        dominantColor: 'grey',
        images: ['/uploads/sample-tee.svg'],
        cleanImageUrl: '/uploads/sample-tee.svg',
        brand: 'Uniqlo',
      },
      {
        title: 'Raw Selvedge Denim',
        category: 'jeans',
        size: '32',
        dominantColor: 'navy',
        images: ['/uploads/sample-jeans.svg'],
        cleanImageUrl: '/uploads/sample-jeans.svg',
        brand: 'Naked & Famous',
      },
      {
        title: 'Washed Black Slim Jeans',
        category: 'jeans',
        size: '32',
        dominantColor: 'black',
        images: ['/uploads/sample-blackjeans.svg'],
        cleanImageUrl: '/uploads/sample-blackjeans.svg',
        brand: 'Zara',
      },
      {
        title: 'Court Classic Leather Sneaker',
        category: 'shoes',
        size: '10 UK',
        dominantColor: 'white',
        images: ['/uploads/sample-sneaker.svg'],
        cleanImageUrl: '/uploads/sample-sneaker.svg',
        brand: 'Common Projects',
      },
      {
        title: 'Full-Grain Leather Belt',
        category: 'belts',
        size: '34',
        dominantColor: 'brown',
        images: ['/uploads/sample-belt.svg'],
        cleanImageUrl: '/uploads/sample-belt.svg',
        brand: 'Timberland',
      },
    ];

    await Cloth.deleteMany({});
    const inserted = await Cloth.insertMany(sampleClothes);

    res.json({
      success: true,
      message: 'Wardrobe initialized with sample clothes across all categories!',
      count: inserted.length,
      data: inserted,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
