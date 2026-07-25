import fs from 'fs';
import path from 'path';
import { createCanvas, registerFont } from 'canvas';

// Generate icon
const size = 128; // Largest size, can scale down
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');

const fontLuckiest = path.join(process.cwd(), 'public', 'fonts', 'LuckiestGuy-Regular.ttf');
if (fs.existsSync(fontLuckiest)) {
  registerFont(fontLuckiest, { family: 'Luckiest Guy' });
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
}

// Clear transparent background
ctx.clearRect(0, 0, size, size);

// Background and border
ctx.fillStyle = '#064e3b';
ctx.strokeStyle = '#f1c40f';
ctx.lineWidth = size * 0.05;

// Fill and stroke a rounded rectangle
roundRect(ctx, size * 0.05, size * 0.05, size * 0.9, size * 0.9, size * 0.2, true, true);

// Text
ctx.fillStyle = '#f1c40f';
ctx.font = `${size * 0.3}px "Luckiest Guy", sans-serif`;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('NAIJA', size / 2, size * 0.35);
ctx.fillText('WHOT', size / 2, size * 0.65);

// Get base64
const iconDataUrl = canvas.toDataURL('image/png');

const manifestPath = path.join(process.cwd(), 'public', 'manifest.webapp');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

manifest.icons = {
  "56": iconDataUrl,
  "112": iconDataUrl,
  "128": iconDataUrl
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log("Updated manifest.webapp with base64 icon!");
