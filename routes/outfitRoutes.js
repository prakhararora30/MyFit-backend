const express = require('express');
const router = express.Router();
const Outfit = require('../models/Outfit');
const Cloth = require('../models/Cloth');
const { generateOutfits } = require('../services/aiStylistService');
const { composeOutfitImage } = require('../services/mannequinCompositor');

/**
 * POST /api/outfits/generate
 * Generates 5 to 7 coordinated outfits from wardrobe and merges clothes into mannequin images
 */
router.post('/generate', async (req, res) => {
  try {
    const { count = 7, vibe } = req.body;

    // Fetch user's entire wardrobe
    const clothes = await Cloth.find({});

    if (clothes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your wardrobe is empty! Please add shirts, jeans, and shoes first.',
      });
    }

    // Generate 5-7 coordinated outfit combinations via AI Stylist
    const rawOutfits = await generateOutfits(clothes, count);

    // Populate and create the merged mannequin composite image for each outfit
    const preparedOutfits = [];

    for (let i = 0; i < rawOutfits.length; i++) {
      const raw = rawOutfits[i];

      const topItem = raw.items.top ? await Cloth.findById(raw.items.top) : null;
      const jeansItem = raw.items.jeans ? await Cloth.findById(raw.items.jeans) : null;
      const shoesItem = raw.items.shoes ? await Cloth.findById(raw.items.shoes) : null;
      const jacketItem = raw.items.jacket ? await Cloth.findById(raw.items.jacket) : null;
      const beltItem = raw.items.belt ? await Cloth.findById(raw.items.belt) : null;

      // Merge the items into a single mannequin composite image!
      const compositeImageUrl = await composeOutfitImage({
        top: topItem,
        jacket: jacketItem,
        jeans: jeansItem,
        shoes: shoesItem,
        belt: beltItem,
        outputFilename: `outfit_composite_${Date.now()}_${i + 1}.svg`,
      });

      const outfitDoc = new Outfit({
        title: raw.title,
        vibe: raw.vibe || vibe || 'Casual Weekend',
        matchScore: raw.matchScore || '95%',
        items: {
          jacket: jacketItem ? jacketItem._id : null,
          top: topItem ? topItem._id : null,
          jeans: jeansItem ? jeansItem._id : null,
          shoes: shoesItem ? shoesItem._id : null,
          belt: beltItem ? beltItem._id : null,
        },
        compositeImageUrl: compositeImageUrl,
        aiStylistNotes: raw.aiStylistNotes,
      });

      await outfitDoc.save();

      // Populate populated object to send to the client
      const populated = await Outfit.findById(outfitDoc._id)
        .populate('items.top')
        .populate('items.jacket')
        .populate('items.jeans')
        .populate('items.shoes')
        .populate('items.belt');

      preparedOutfits.push(populated);
    }

    res.json({
      success: true,
      count: preparedOutfits.length,
      message: `Successfully generated ${preparedOutfits.length} outfits with composite mannequin views!`,
      data: preparedOutfits,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/outfits
 * Fetch recently generated outfits
 */
router.get('/', async (req, res) => {
  try {
    const outfits = await Outfit.find({})
      .sort({ createdAt: -1 })
      .limit(14)
      .populate('items.top')
      .populate('items.jacket')
      .populate('items.jeans')
      .populate('items.shoes')
      .populate('items.belt');

    res.json({
      success: true,
      count: outfits.length,
      data: outfits,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/outfits/:id/favorite
 */
router.post('/:id/favorite', async (req, res) => {
  try {
    const outfit = await Outfit.findById(req.params.id);
    if (!outfit) {
      return res.status(404).json({ success: false, message: 'Outfit not found' });
    }
    outfit.isFavorite = !outfit.isFavorite;
    await outfit.save();
    res.json({ success: true, data: outfit });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/outfits/:id/wear
 */
router.post('/:id/wear', async (req, res) => {
  try {
    const outfit = await Outfit.findById(req.params.id);
    if (!outfit) {
      return res.status(404).json({ success: false, message: 'Outfit not found' });
    }

    outfit.wornCount += 1;
    await outfit.save();

    // Increment wear count for all garments in this outfit
    const itemIds = [
      outfit.items.jacket,
      outfit.items.top,
      outfit.items.jeans,
      outfit.items.shoes,
      outfit.items.belt,
    ].filter(Boolean);

    await Cloth.updateMany({ _id: { $in: itemIds } }, { $inc: { wearCount: 1 } });

    res.json({
      success: true,
      message: 'Recorded as worn today! Wardrobe stats updated.',
      data: outfit,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
