import fs from 'fs';
import path from 'path';
import { createCanvas, registerFont } from 'canvas';

// Register custom uploaded fonts if present
const fontLuckiest = path.join(process.cwd(), 'public', 'fonts', 'LuckiestGuy-Regular.ttf');
const fontBaloo = path.join(process.cwd(), 'public', 'fonts', 'BalooChettan-Regular.ttf');

if (fs.existsSync(fontLuckiest)) {
  registerFont(fontLuckiest, { family: 'Luckiest Guy' });
}
if (fs.existsSync(fontBaloo)) {
  registerFont(fontBaloo, { family: 'Baloo Chettan' });
}

console.log('Generating Whot game graphics in sharp contrast...');

const base64Assets = {};

// Suit colors
const SUIT_COLORS = {
  circle: '#E74C3C',   // Red
  triangle: '#2ECC71', // Green
  cross: '#3498DB',    // Blue
  square: '#E67E22',   // Orange
  star: '#9B59B6',     // Purple
  whot: '#F1C40F'      // Gold/Yellow
};

// Draw shape on canvas context
function drawSuitShape(ctx, suit, cx, cy, radius, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, radius / 4);
  ctx.beginPath();

  if (suit === 'circle') {
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (suit === 'triangle') {
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx + radius, cy + radius * 0.9);
    ctx.lineTo(cx - radius, cy + radius * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (suit === 'square') {
    const size = radius * 1.6;
    ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
    ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
  } else if (suit === 'cross') {
    const w = radius * 0.5;
    const h = radius * 1.5;
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    ctx.fillRect(cx - h / 2, cy - w / 2, h, w);
  } else if (suit === 'star') {
    const points = 5;
    const outer = radius;
    const inner = radius * 0.5;
    for (let i = 0; i < points * 2; i++) {
      const r = (i % 2 === 0) ? outer : inner;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (suit === 'whot') {
    // Whot starburst / emblem
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F1C40F';
    ctx.font = `bold ${Math.round(radius * 0.8)}px 'Luckiest Guy', 'Baloo Chettan', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('20', cx, cy);
  }
}

// 1. Generate Card Back (48x68 px)
{
  const width = 48;
  const height = 68;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // White outer card border (matching front cards)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0.75, 0.75, width - 1.5, height - 1.5);

  // Inner royal blue back pattern
  ctx.fillStyle = '#1e40af';
  ctx.fillRect(3, 3, width - 6, height - 6);

  // Diamond grid pattern
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1;
  for (let x = -height; x < width + height; x += 6) {
    ctx.beginPath();
    ctx.moveTo(x, 3);
    ctx.lineTo(x + height, height - 3);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, height - 3);
    ctx.lineTo(x + height, 3);
    ctx.stroke();
  }

  // Inner Whot Emblem
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(8, 16, width - 16, height - 32);
  ctx.strokeStyle = '#f1c40f';
  ctx.lineWidth = 1;
  ctx.strokeRect(8, 16, width - 16, height - 32);

  ctx.fillStyle = '#f1c40f';
  ctx.font = "bold 10px 'Luckiest Guy', 'Baloo Chettan', sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WHOT', width / 2, height / 2);

  base64Assets['card_back'] = `data:image/png;base64,${canvas.toBuffer().toString('base64')}`;
}

// 2. Generate Individual Cards for Whot Deck
const DECK_SPEC = {
  circle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  triangle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  cross: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  square: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  star: [1, 2, 3, 4, 5, 7, 8],
  whot: [20]
};

for (const [suit, numbers] of Object.entries(DECK_SPEC)) {
  for (const num of numbers) {
    const width = 48;
    const height = 68;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Card background: Crisp white with dark border
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    const suitColor = SUIT_COLORS[suit];

    // Corner Top-Left Number
    ctx.fillStyle = suitColor;
    ctx.font = "bold 11px 'Luckiest Guy', 'Baloo Chettan', sans-serif";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${num}`, 4, 4);

    // Star point indicator
    if (suit === 'star') {
      ctx.font = "bold 8px 'Luckiest Guy', 'Baloo Chettan', sans-serif";
      ctx.fillText(`(${num * 2})`, 4, 16);
    }

    // Corner Bottom-Right Number (Inverted)
    ctx.save();
    ctx.translate(width - 4, height - 4);
    ctx.rotate(Math.PI);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = "bold 11px 'Luckiest Guy', 'Baloo Chettan', sans-serif";
    ctx.fillText(`${num}`, 0, 0);
    if (suit === 'star') {
      ctx.font = "bold 8px 'Luckiest Guy', 'Baloo Chettan', sans-serif";
      ctx.fillText(`(${num * 2})`, 0, 12);
    }
    ctx.restore();

    // Center Suit Symbol
    if (suit === 'whot') {
      ctx.fillStyle = '#111111';
      ctx.font = "bold 12px 'Luckiest Guy', 'Baloo Chettan', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('WHOT', width / 2, height / 2 - 6);

      ctx.fillStyle = '#F1C40F';
      ctx.font = "bold 14px 'Luckiest Guy', 'Baloo Chettan', sans-serif";
      ctx.fillText('20', width / 2, height / 2 + 8);
    } else {
      drawSuitShape(ctx, suit, width / 2, height / 2, 11, suitColor);
    }

    const cardKey = `card_${suit}_${num}`;
    base64Assets[cardKey] = `data:image/png;base64,${canvas.toBuffer().toString('base64')}`;
  }
}

// 3. Generate WHOT Selection Graphic Image (320x240 Modal Graphic Image)
{
  const width = 320;
  const height = 240;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Clear full canvas so bottom area (Y > 162) is 100% transparent (revealing player hand cards)
  ctx.clearRect(0, 0, width, height);

  // Compact modal window backdrop (top Y=10 to Y=162)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
  ctx.fillRect(8, 10, width - 16, 152);

  // Border frame around modal window
  ctx.strokeStyle = '#F1C40F';
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 10, width - 16, 152);

  // Banner Title Header
  ctx.fillStyle = '#F1C40F';
  ctx.fillRect(16, 16, width - 32, 26);
  ctx.fillStyle = '#0f172a';
  ctx.font = "bold 13px 'Luckiest Guy', 'Baloo Chettan', sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('I NEED... SELECT CARD SUIT', width / 2, 29);

  // 5 Suits Grid selector positions
  const suits = ['circle', 'triangle', 'cross', 'square', 'star'];
  const names = ['CIRCLE', 'TRIANGLE', 'CROSS', 'SQUARE', 'STAR'];
  const keys = ['[1]', '[2]', '[3]', '[4]', '[5]'];

  suits.forEach((s, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);

    let cx, cy;
    if (row === 0) {
      cx = 58 + col * 102;
      cy = 72;
    } else {
      cx = 110 + (idx - 3) * 100;
      cy = 124;
    }

    // Card/Suit badge background box (78 wide, 42 high)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx - 39, cy - 21, 78, 42);
    ctx.strokeStyle = SUIT_COLORS[s];
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 39, cy - 21, 78, 42);

    // Draw Shape
    drawSuitShape(ctx, s, cx, cy - 6, 10, SUIT_COLORS[s]);

    // Name label
    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 9px 'Luckiest Guy', 'Baloo Chettan', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(names[idx], cx, cy + 12);

    // Key label
    ctx.fillStyle = '#F1C40F';
    ctx.font = "bold 9px 'Luckiest Guy', 'Baloo Chettan', sans-serif";
    ctx.fillText(keys[idx], cx - 26, cy - 12);
  });

  // Footer instructions inside modal
  ctx.fillStyle = '#94a3b8';
  ctx.font = "9px 'Luckiest Guy', 'Baloo Chettan', sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText('Use 1-5 or D-Pad / Touch to Select', width / 2, 153);

  base64Assets['whot_selector_modal'] = `data:image/png;base64,${canvas.toBuffer().toString('base64')}`;
}

// 4. Generate Suit Icons (Individual 32x32 textures for HUD & Selector UI)
const suitsList = ['circle', 'triangle', 'cross', 'square', 'star', 'whot'];
suitsList.forEach((s) => {
  const size = 32;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, size, size);

  drawSuitShape(ctx, s, size / 2, size / 2, 10, SUIT_COLORS[s]);

  base64Assets[`suit_${s}`] = `data:image/png;base64,${canvas.toBuffer().toString('base64')}`;
});
console.log('Saved individual suit icon graphics.');

// Write base64Assets JSON
const base64JsonPath = path.join(process.cwd(), 'public', 'assets_base64.json');
fs.writeFileSync(base64JsonPath, JSON.stringify(base64Assets, null, 2));
console.log('Saved assets_base64.json successfully!');

console.log('Whot graphics generation complete!');
