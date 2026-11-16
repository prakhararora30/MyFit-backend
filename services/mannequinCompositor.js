const fs = require('fs');
const path = require('path');

/**
 * Mannequin Image Compositor (Option 1 Blueprint)
 * Merges Top + Jacket + Jeans + Shoes (+ optional Belt) onto a single mannequin silhouette image.
 */

async function composeOutfitImage({ top, jacket, jeans, shoes, belt, outputFilename }) {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = outputFilename || `outfit_mannequin_${Date.now()}.svg`;
  const filePath = path.join(uploadsDir, filename);

  // Colors / styling attributes
  const topColor = top?.dominantColor?.toLowerCase() || '#f1f5f9';
  const jacketColor = jacket?.dominantColor?.toLowerCase() || '#1e293b';
  const jeansColor = jeans?.dominantColor?.toLowerCase() || '#1e3a8a';
  const shoesColor = shoes?.dominantColor?.toLowerCase() || '#ffffff';
  const beltColor = belt?.dominantColor?.toLowerCase() || '#78350f';

  // Build an SVG mannequin with the layered clothes
  const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 650" width="400" height="650">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-opacity="0.25"/>
    </filter>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="mannequinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#334155" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
  </defs>

  <!-- Studio Stage Background -->
  <rect width="100%" height="100%" fill="url(#bgGrad)" rx="24"/>
  <ellipse cx="200" cy="610" rx="140" ry="20" fill="#000000" opacity="0.4"/>

  <!-- Mannequin Head & Neck (Ghost Silhouette) -->
  <g opacity="0.35">
    <ellipse cx="200" cy="70" rx="30" ry="40" fill="url(#mannequinGrad)"/>
    <rect x="190" y="105" width="20" height="28" rx="4" fill="url(#mannequinGrad)"/>
    <path d="M130 135 Q200 120 270 135 L255 280 L145 280 Z" fill="url(#mannequinGrad)"/>
    <path d="M150 280 L190 570 L160 570 L135 280 Z" fill="url(#mannequinGrad)"/>
    <path d="M250 280 L210 570 L240 570 L265 280 Z" fill="url(#mannequinGrad)"/>
  </g>

  <!-- LAYER 1: BASE TOP (Shirt or T-Shirt, if present) -->
  ${
    top
      ? `
  <g id="base-top" filter="url(#shadow)">
    <path d="M145 130 C175 145 225 145 255 130 L295 190 L265 205 L250 180 L250 330 L150 330 L150 180 L135 205 L105 190 Z" 
          fill="${topColor === 'white' ? '#f8fafc' : topColor}" 
          stroke="#475569" stroke-width="2"/>
    <path d="M145 130 C175 150 225 150 255 130" stroke="#94a3b8" stroke-width="3" fill="none"/>
  </g>
  `
      : ''
  }

  <!-- LAYER 2: OUTERWEAR (Jacket, if present) -->
  ${
    jacket
      ? `
  <g id="outerwear-jacket" filter="url(#shadow)">
    <!-- Left draped panel -->
    <path d="M130 135 L170 125 L180 135 L160 210 L155 345 L135 345 L115 230 L95 210 Z" 
          fill="${jacketColor === 'black' ? '#18181b' : jacketColor}" 
          stroke="#0f172a" stroke-width="2.5"/>
    <!-- Right draped panel -->
    <path d="M270 135 L230 125 L220 135 L240 210 L245 345 L265 345 L285 230 L305 210 Z" 
          fill="${jacketColor === 'black' ? '#18181b' : jacketColor}" 
          stroke="#0f172a" stroke-width="2.5"/>
    <!-- Jacket Collar Back -->
    <path d="M170 125 Q200 135 230 125" stroke="#334155" stroke-width="4" fill="none"/>
  </g>
  `
      : ''
  }

  <!-- LAYER 3: WAISTLINE ACCESSORY (Belt, if present) -->
  ${
    belt
      ? `
  <g id="belt" filter="url(#shadow)">
    <rect x="146" y="325" width="108" height="15" rx="3" fill="${beltColor}" stroke="#3f1d0b" stroke-width="1.5"/>
    <rect x="188" y="321" width="24" height="23" rx="3" fill="none" stroke="#f59e0b" stroke-width="3"/>
  </g>
  `
      : ''
  }

  <!-- LAYER 4: BOTTOMS (Jeans / Trousers, if present) -->
  ${
    jeans
      ? `
  <g id="bottom-jeans" filter="url(#shadow)">
    <path d="M145 335 L255 335 L250 560 L208 560 L200 395 L192 560 L150 560 Z" 
          fill="${jeansColor === 'black' ? '#1e293b' : jeansColor}" 
          stroke="#0f172a" stroke-width="2"/>
    <path d="M145 355 L255 355" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="3 3"/>
    <path d="M200 335 L200 380" stroke="#0f172a" stroke-width="2"/>
  </g>
  `
      : ''
  }

  <!-- LAYER 5: FOOTWEAR (Shoes / Sneakers, if present) -->
  ${
    shoes
      ? `
  <g id="footwear-shoes" filter="url(#shadow)">
    <!-- Left Shoe -->
    <path d="M135 560 C135 545 145 530 170 530 L195 540 L205 570 L130 570 Z" 
          fill="${shoesColor === 'white' ? '#f8fafc' : shoesColor}" 
          stroke="#64748b" stroke-width="1.5"/>
    <rect x="126" y="565" width="82" height="10" rx="3" fill="#cbd5e1"/>

    <!-- Right Shoe -->
    <path d="M265 560 C265 545 255 530 230 530 L205 540 L195 570 L270 570 Z" 
          fill="${shoesColor === 'white' ? '#f8fafc' : shoesColor}" 
          stroke="#64748b" stroke-width="1.5"/>
    <rect x="192" y="565" width="82" height="10" rx="3" fill="#cbd5e1"/>
  </g>
  `
      : ''
  }

  <!-- Watermark / Brand Badge -->
  <text x="200" y="632" font-family="sans-serif" font-size="11" font-weight="bold" fill="#64748b" text-anchor="middle" letter-spacing="1.5">
    MYFITS • AI MANNEQUIN COMPOSITOR
  </text>
</svg>
`;

  await fs.promises.writeFile(filePath, svgContent.trim());
  return `/uploads/${filename}`;
}

module.exports = {
  composeOutfitImage,
};
