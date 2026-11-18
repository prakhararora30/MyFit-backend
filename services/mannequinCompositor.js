const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * Mannequin Image Compositor — Real Photo Edition
 *
 * Instead of drawing colored vector paths, this compositor embeds the
 * actual uploaded clothing photos as <image> elements inside the SVG,
 * laid out anatomically on a ghost mannequin silhouette.
 *
 * Layering order (bottom → top):
 *   1. Dark studio background
 *   2. Ghost mannequin silhouette (semi-transparent)
 *   3. Jeans / bottoms photo
 *   4. Base top (shirt / tshirt) photo
 *   5. Jacket / outerwear photo
 *   6. Belt photo (waistline strip)
 *   7. Shoes / footwear photo
 */

const BASE_URL = process.env.HOST_URL || 'https://myfit-backend-9d6h.onrender.com';

/**
 * Convert a relative /uploads/... path to an absolute URL the SVG can reference.
 */
function toAbsoluteUrl(imagePath) {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  const clean = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${BASE_URL}${clean}`;
}

/**
 * Returns the first valid image URL for a cloth item.
 */
function getItemImageUrl(item) {
  if (!item) return null;
  if (item.cleanImageUrl) return toAbsoluteUrl(item.cleanImageUrl);
  if (item.images && item.images.length > 0) return toAbsoluteUrl(item.images[0]);
  return null;
}

/**
 * Optional: Use Gemini to generate a short AI stylist note about the outfit.
 * Requires GEMINI_API_KEY env var. Falls back gracefully if unavailable.
 */
async function getGeminiStylistNote({ top, jacket, jeans, shoes, belt }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    return null;
  }

  try {
    const pieces = [
      top ? `${top.dominantColor || ''} ${top.title} (${top.category})` : null,
      jeans ? `${jeans.dominantColor || ''} ${jeans.title}` : null,
      jacket ? `${jacket.dominantColor || ''} ${jacket.title} jacket` : null,
      shoes ? `${shoes.dominantColor || ''} ${shoes.title}` : null,
      belt ? `${belt.dominantColor || ''} belt` : null,
    ].filter(Boolean).join(', ');

    const prompt = `You are a fashion stylist. In exactly 1-2 sentences (max 25 words), describe why this outfit combination works: ${pieces}. Be specific about colors and style.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 80 },
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
            'Content-Length': Buffer.byteLength(body),
          },
          timeout: 15000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve(data));
        }
      );
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      req.write(body);
      req.end();
    });

    const json = JSON.parse(responseText);
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? text.trim() : null;
  } catch (err) {
    console.warn('Gemini stylist note skipped:', err.message);
    return null;
  }
}

/**
 * Main compositor — builds an SVG that embeds real clothing photos on a mannequin.
 */
async function composeOutfitImage({ top, jacket, jeans, shoes, belt, outputFilename }) {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = outputFilename || `outfit_mannequin_${Date.now()}.svg`;
  const filePath = path.join(uploadsDir, filename);

  // Resolve actual photo URLs for each item
  const topUrl    = getItemImageUrl(top);
  const jacketUrl = getItemImageUrl(jacket);
  const jeansUrl  = getItemImageUrl(jeans);
  const shoesUrl  = getItemImageUrl(shoes);
  const beltUrl   = getItemImageUrl(belt);

  // Get optional Gemini stylist note (non-blocking)
  const geminiNote = await getGeminiStylistNote({ top, jacket, jeans, shoes, belt });

  // Build label text
  const labelParts = [
    top ? top.title : null,
    jeans ? jeans.title : null,
    jacket ? jacket.title : null,
  ].filter(Boolean);
  const labelText = labelParts.length > 0 ? labelParts.join(' · ') : 'AI Outfit';
  const noteText = geminiNote
    ? geminiNote.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    : 'AI-curated outfit combination';

  /**
   * SVG layout (400×680 canvas):
   *
   *   Head  cy≈60   (ghost only)
   *   Neck  y≈100
   *   Jacket y≈115–340  (draped over shirt, left+right panels only)
   *   Shirt  y≈115–330  (torso box — real photo fills this rect)
   *   Belt   y≈328–344  (narrow strip)
   *   Jeans  y≈340–570  (legs — real photo fills this rect)
   *   Shoes  y≈570–610  (foot rects — real photo fills)
   */
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  viewBox="0 0 400 680" width="400" height="680">
  <defs>
    <filter id="shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.5"/>
    </filter>
    <filter id="softShadow">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.3"/>
    </filter>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0f1e"/>
      <stop offset="100%" stop-color="#1a2235"/>
    </linearGradient>
    <linearGradient id="mannequinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2d3f55" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#1a2535" stop-opacity="0.4"/>
    </linearGradient>
    <!-- Clip paths to keep photos within the mannequin silhouette shape -->
    <clipPath id="torsoClip">
      <path d="M135 118 C160 108 240 108 265 118 L295 175 L270 188 L260 165 L260 332 L140 332 L140 165 L130 188 L105 175 Z"/>
    </clipPath>
    <clipPath id="jeansClip">
      <path d="M138 335 L262 335 L256 568 L212 568 L200 395 L188 568 L144 568 Z"/>
    </clipPath>
    <clipPath id="jacketLeftClip">
      <path d="M105 175 L130 188 L135 118 L165 108 L160 335 L130 335 L100 220 Z"/>
    </clipPath>
    <clipPath id="jacketRightClip">
      <path d="M295 175 L270 188 L265 118 L235 108 L240 335 L270 335 L300 220 Z"/>
    </clipPath>
    <clipPath id="leftShoeClip">
      <path d="M124 568 L184 568 L190 585 L180 600 L118 600 L112 585 Z"/>
    </clipPath>
    <clipPath id="rightShoeClip">
      <path d="M216 568 L276 568 L288 585 L282 600 L210 600 L210 585 Z"/>
    </clipPath>
  </defs>

  <!-- Studio Background -->
  <rect width="400" height="680" fill="url(#bgGrad)" rx="20"/>

  <!-- Floor shadow ellipse -->
  <ellipse cx="200" cy="625" rx="130" ry="16" fill="#000000" opacity="0.5"/>

  <!-- ══════════════════════════════════════════════
       GHOST MANNEQUIN SILHOUETTE (behind clothes)
  ══════════════════════════════════════════════ -->
  <g opacity="0.25" fill="url(#mannequinGrad)">
    <!-- Head -->
    <ellipse cx="200" cy="60" rx="28" ry="36"/>
    <!-- Neck -->
    <rect x="192" y="92" width="16" height="28" rx="4"/>
    <!-- Torso body -->
    <path d="M140 118 Q200 108 260 118 L260 332 L140 332 Z"/>
    <!-- Left arm stub -->
    <path d="M105 175 L135 118 L140 332 L118 332 Z"/>
    <!-- Right arm stub -->
    <path d="M295 175 L265 118 L260 332 L282 332 Z"/>
    <!-- Left leg -->
    <path d="M140 335 L200 335 L192 568 L144 568 Z"/>
    <!-- Right leg -->
    <path d="M200 335 L260 335 L256 568 L208 568 Z"/>
  </g>

  <!-- ══════════════════════════════════════════════
       LAYER 1 — JEANS / BOTTOMS (real photo)
  ══════════════════════════════════════════════ -->
  ${jeansUrl ? `
  <g id="jeans-layer" filter="url(#softShadow)">
    <image href="${jeansUrl}"
      x="130" y="310" width="140" height="275"
      preserveAspectRatio="xMidYMid meet"
      clip-path="url(#jeansClip)"/>
    <!-- Subtle dark outline -->
    <path d="M138 335 L262 335 L256 568 L212 568 L200 395 L188 568 L144 568 Z"
      fill="none" stroke="#0a0f1e" stroke-width="2" opacity="0.6"/>
    <!-- Center seam line -->
    <line x1="200" y1="335" x2="200" y2="380" stroke="#0a0f1e" stroke-width="1.5" opacity="0.4"/>
  </g>
  ` : `
  <!-- No jeans in wardrobe — ghost placeholder -->
  <path d="M138 335 L262 335 L256 568 L212 568 L200 395 L188 568 L144 568 Z"
    fill="#1e3a8a" fill-opacity="0.3" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="6 4"/>
  <text x="200" y="455" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="sans-serif">No bottoms added</text>
  `}

  <!-- ══════════════════════════════════════════════
       LAYER 2 — BASE TOP (shirt / tshirt — real photo)
  ══════════════════════════════════════════════ -->
  ${topUrl ? `
  <g id="top-layer" filter="url(#softShadow)">
    <image href="${topUrl}"
      x="120" y="90" width="160" height="260"
      preserveAspectRatio="xMidYMid meet"
      clip-path="url(#torsoClip)"/>
    <!-- Neckline detail -->
    <path d="M170 108 Q200 118 230 108" stroke="#94a3b8" stroke-width="2.5" fill="none" opacity="0.7"/>
    <!-- Torso outline -->
    <path d="M135 118 C160 108 240 108 265 118 L295 175 L270 188 L260 165 L260 332 L140 332 L140 165 L130 188 L105 175 Z"
      fill="none" stroke="#334155" stroke-width="1.5" opacity="0.5"/>
  </g>
  ` : `
  <path d="M135 118 C160 108 240 108 265 118 L295 175 L270 188 L260 165 L260 332 L140 332 L140 165 L130 188 L105 175 Z"
    fill="#f8fafc" fill-opacity="0.15" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6 4"/>
  <text x="200" y="230" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="sans-serif">No top added</text>
  `}

  <!-- ══════════════════════════════════════════════
       LAYER 3 — JACKET / OUTERWEAR (real photo, flanking panels)
  ══════════════════════════════════════════════ -->
  ${jacketUrl ? `
  <g id="jacket-layer" filter="url(#shadow)">
    <!-- Left jacket panel -->
    <image href="${jacketUrl}"
      x="80" y="90" width="120" height="260"
      preserveAspectRatio="xMidYMid meet"
      clip-path="url(#jacketLeftClip)"/>
    <!-- Right jacket panel -->
    <image href="${jacketUrl}"
      x="200" y="90" width="120" height="260"
      preserveAspectRatio="xMidYMid meet"
      clip-path="url(#jacketRightClip)"/>
    <!-- Jacket outline panels -->
    <path d="M105 175 L130 188 L135 118 L165 108 L160 335 L130 335 L100 220 Z"
      fill="none" stroke="#0f172a" stroke-width="2" opacity="0.6"/>
    <path d="M295 175 L270 188 L265 118 L235 108 L240 335 L270 335 L300 220 Z"
      fill="none" stroke="#0f172a" stroke-width="2" opacity="0.6"/>
    <!-- Jacket collar V-line -->
    <path d="M165 108 L200 148 L235 108" stroke="#475569" stroke-width="2.5" fill="none" opacity="0.8"/>
  </g>
  ` : ''}

  <!-- ══════════════════════════════════════════════
       LAYER 4 — BELT (narrow strip, real photo or colored bar)
  ══════════════════════════════════════════════ -->
  ${belt ? `
  <g id="belt-layer">
    ${beltUrl ? `
    <image href="${beltUrl}" x="136" y="327" width="128" height="18"
      preserveAspectRatio="xMidYMid slice"
      clip-path="inset(0 round 4px)"/>
    ` : `
    <rect x="136" y="327" width="128" height="18" rx="4"
      fill="${belt.dominantColor || '#78350f'}" opacity="0.9"/>
    `}
    <!-- Buckle -->
    <rect x="188" y="323" width="24" height="26" rx="3"
      fill="none" stroke="#f59e0b" stroke-width="2.5"/>
    <rect x="195" y="332" width="10" height="8" rx="1" fill="#f59e0b" opacity="0.7"/>
  </g>
  ` : ''}

  <!-- ══════════════════════════════════════════════
       LAYER 5 — SHOES / FOOTWEAR (real photo)
  ══════════════════════════════════════════════ -->
  ${shoesUrl ? `
  <g id="shoes-layer" filter="url(#softShadow)">
    <!-- Left shoe -->
    <image href="${shoesUrl}"
      x="108" y="560" width="82" height="48"
      preserveAspectRatio="xMidYMid meet"
      clip-path="url(#leftShoeClip)"/>
    <path d="M124 568 L184 568 L190 585 L180 600 L118 600 L112 585 Z"
      fill="none" stroke="#475569" stroke-width="1.5" opacity="0.6"/>
    <!-- Left sole -->
    <rect x="108" y="597" width="84" height="8" rx="4" fill="#cbd5e1" opacity="0.4"/>

    <!-- Right shoe -->
    <image href="${shoesUrl}"
      x="210" y="560" width="82" height="48"
      preserveAspectRatio="xMidYMid meet"
      clip-path="url(#rightShoeClip)"/>
    <path d="M216 568 L276 568 L288 585 L282 600 L210 600 L210 585 Z"
      fill="none" stroke="#475569" stroke-width="1.5" opacity="0.6"/>
    <!-- Right sole -->
    <rect x="208" y="597" width="84" height="8" rx="4" fill="#cbd5e1" opacity="0.4"/>
  </g>
  ` : ''}

  <!-- ══════════════════════════════════════════════
       ITEM LABELS (bottom info strip)
  ══════════════════════════════════════════════ -->
  <rect x="20" y="612" width="360" height="52" rx="10" fill="#0f172a" fill-opacity="0.85"/>
  <text x="200" y="629" text-anchor="middle" fill="#818cf8" font-size="9" font-family="sans-serif" font-weight="bold" letter-spacing="1.5">MYFITS • AI OUTFIT COMPOSITOR</text>
  <text x="200" y="644" text-anchor="middle" fill="#f1f5f9" font-size="10" font-family="sans-serif">${labelText.substring(0, 48)}</text>
  <text x="200" y="658" text-anchor="middle" fill="#94a3b8" font-size="8.5" font-family="sans-serif" font-style="italic">${noteText.substring(0, 60)}</text>
</svg>`;

  await fs.promises.writeFile(filePath, svgContent.trim());
  return `/uploads/${filename}`;
}

module.exports = { composeOutfitImage };
