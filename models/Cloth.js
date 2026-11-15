const mongoose = require('mongoose');

const clothSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['shirts', 'tshirts', 'jackets', 'jeans', 'shoes', 'belts', 'accessories'],
      lowercase: true,
      index: true,
    },
    size: {
      type: String,
      required: true,
      trim: true,
    },
    images: {
      type: [String],
      validate: [
        (val) => val.length >= 1 && val.length <= 5,
        'Item must have between 1 and 5 images (2-3 recommended)',
      ],
      required: true,
    },
    cleanImageUrl: {
      type: String,
      default: '',
    },
    dominantColor: {
      type: String,
      default: 'Unknown',
    },
    brand: {
      type: String,
      default: '',
    },
    vibe: {
      type: String,
      default: 'Casual',
    },
    wearCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Cloth', clothSchema);
