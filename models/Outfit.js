const mongoose = require('mongoose');

const outfitSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    vibe: {
      type: String,
      default: 'Casual Weekend',
    },
    matchScore: {
      type: String,
      default: '95%',
    },
    items: {
      jacket: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cloth',
        default: null,
      },
      top: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cloth',
        required: true,
      },
      jeans: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cloth',
        required: true,
      },
      shoes: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cloth',
        required: true,
      },
      belt: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cloth',
        default: null,
      },
    },
    compositeImageUrl: {
      type: String,
      default: '',
    },
    aiStylistNotes: {
      type: String,
      default: '',
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    wornCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Outfit', outfitSchema);
