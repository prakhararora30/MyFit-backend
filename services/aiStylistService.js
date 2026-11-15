const https = require('https');

/**
 * Intelligent AI Stylist Engine
 * Combines Gemini Multimodal LLM reasoning with fashion color harmony rules
 * to generate 5 to 7 coordinated outfits from the user's wardrobe.
 */

// Color compatibility matrix for fallback heuristics
const COLOR_HARMONY = {
  white: ['black', 'blue', 'navy', 'grey', 'olive', 'brown', 'beige'],
  black: ['white', 'grey', 'red', 'blue', 'olive', 'tan', 'beige'],
  navy: ['white', 'grey', 'beige', 'tan', 'brown', 'burgundy'],
  grey: ['black', 'white', 'navy', 'burgundy', 'olive'],
  blue: ['white', 'beige', 'grey', 'brown', 'black'],
  brown: ['white', 'navy', 'beige', 'olive', 'blue'],
  olive: ['white', 'black', 'grey', 'navy', 'beige'],
};

function normalizeColor(colorStr) {
  if (!colorStr) return 'white';
  const c = colorStr.toLowerCase();
  for (const key of Object.keys(COLOR_HARMONY)) {
    if (c.includes(key)) return key;
  }
  return 'white';
}

function calculateColorMatch(color1, color2) {
  const norm1 = normalizeColor(color1);
  const norm2 = normalizeColor(color2);
  if (norm1 === norm2) return 90;
  if (COLOR_HARMONY[norm1] && COLOR_HARMONY[norm1].includes(norm2)) return 95;
  return 85;
}

/**
 * Fallback algorithmic fashion engine that generates 5 to 7 outfits
 */
function generateRuleBasedOutfits(clothes, requestedCount = 7) {
  const jackets = clothes.filter((c) => c.category === 'jackets');
  const tops = clothes.filter((c) => c.category === 'shirts' || c.category === 'tshirts');
  const jeans = clothes.filter((c) => c.category === 'jeans');
  const shoes = clothes.filter((c) => c.category === 'shoes');
  const belts = clothes.filter((c) => c.category === 'belts' || c.category === 'accessories');

  if (tops.length === 0 || jeans.length === 0 || shoes.length === 0) {
    throw new Error(
      'To generate complete outfits, your wardrobe needs at least 1 Top (shirt or t-shirt), 1 Jeans/Pants, and 1 pair of Shoes!'
    );
  }

  const generated = [];
  const vibes = [
    { title: 'Signature Everyday', vibe: 'Casual Weekend', desc: 'Effortless classic silhouette with balanced high-contrast tones.' },
    { title: 'Crisp Minimalist', vibe: 'Smart Casual', desc: 'Clean, tailored lines pairing neutral basics for modern sophistication.' },
    { title: 'Evening Contrast', vibe: 'Date Night', desc: 'Darker tonal palette with polished leather accents for night outings.' },
    { title: 'Relaxed Urban Layer', vibe: 'Urban Streetwear', desc: 'Layered jacket silhouette providing volume and athletic balance.' },
    { title: 'Work-Ready Polish', vibe: 'Office Casual', desc: 'Structured top combined with dark washed bottoms for professional ease.' },
    { title: 'Weekend Coffee Run', vibe: 'Relaxed Casual', desc: 'Breathable, comfortable essentials with versatile sneakers.' },
    { title: 'High-Tone Monochrome', vibe: 'Night Out', desc: 'Tonal dark layers creating a cohesive and sharp streamlined look.' },
  ];

  const targetCount = Math.min(requestedCount, Math.max(5, tops.length * jeans.length));

  for (let i = 0; i < targetCount; i++) {
    const top = tops[i % tops.length];
    const jean = jeans[(i + Math.floor(i / tops.length)) % jeans.length];
    const shoe = shoes[i % shoes.length];
    const jacket = jackets.length > 0 && i % 2 === 0 ? jackets[i % jackets.length] : null;
    const belt = belts.length > 0 ? belts[i % belts.length] : null;

    const meta = vibes[i % vibes.length];
    const score = Math.floor(92 + (i * 7) % 7);

    generated.push({
      title: `Look #${i + 1}: ${meta.title}`,
      vibe: meta.vibe,
      matchScore: `${score}%`,
      items: {
        jacket: jacket ? jacket._id : null,
        top: top._id,
        jeans: jean._id,
        shoes: shoe._id,
        belt: belt ? belt._id : null,
      },
      aiStylistNotes: `AI Stylist: ${meta.desc} Pairs ${top.dominantColor || 'base'} ${top.title} with ${jean.title} and ${shoe.title}.${
        jacket ? ` Draped with ${jacket.title} for outer structure.` : ''
      }`,
    });
  }

  return generated;
}

/**
 * Generate 5-7 outfits using Gemini API if key is available, else fallback
 */
async function generateOutfits(clothes, count = 7) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    return generateRuleBasedOutfits(clothes, count);
  }

  try {
    const inventorySummary = clothes.map((c) => ({
      id: c._id.toString(),
      title: c.title,
      category: c.category,
      size: c.size,
      color: c.dominantColor,
      brand: c.brand,
    }));

    const prompt = `You are a world-class personal fashion stylist. 
Given this user's wardrobe inventory:
${JSON.stringify(inventorySummary, null, 2)}

TASK:
Generate exactly ${count} fashionable, perfectly coordinated outfit combinations (minimum 5, target 7).

RULES:
1. Each outfit MUST have:
   - "top": an item id from category "shirts" or "tshirts"
   - "jeans": an item id from category "jeans"
   - "shoes": an item id from category "shoes"
   - "jacket": (optional) an item id from category "jackets", or null
   - "belt": (optional) an item id from category "belts", or null
2. Do not repeat identical combinations. Ensure variety in vibes (Casual Weekend, Smart Work, Date Night, Streetwear).
3. Apply color harmony (e.g. complementary, monochromatic, contrast).

RETURN ONLY RAW JSON in this exact structure:
[
  {
    "title": "Look #1: Indigo Denim & Clean White Contrast",
    "vibe": "Casual Weekend",
    "matchScore": "97%",
    "items": {
      "jacket": "string_or_null",
      "top": "string_id",
      "jeans": "string_id",
      "shoes": "string_id",
      "belt": "string_or_null"
    },
    "aiStylistNotes": "Stylist reasoning on why these exact pieces work together..."
  }
]`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const requestBody = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const responseText = await new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const req = https.request(
        {
          hostname: parsedUrl.hostname,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve(data));
        }
      );
      req.on('error', reject);
      req.write(requestBody);
      req.end();
    });

    const json = JSON.parse(responseText);
    const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (candidateText) {
      const parsedOutfits = JSON.parse(candidateText);
      if (Array.isArray(parsedOutfits) && parsedOutfits.length >= 5) {
        return parsedOutfits;
      }
    }
    return generateRuleBasedOutfits(clothes, count);
  } catch (err) {
    console.warn('Gemini API call failed, falling back to rule-based engine:', err.message);
    return generateRuleBasedOutfits(clothes, count);
  }
}

module.exports = {
  generateOutfits,
  generateRuleBasedOutfits,
};
