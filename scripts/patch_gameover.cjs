const fs = require('fs');
let file = fs.readFileSync('src/game/WhotScene.ts', 'utf8');

const regex = /    bg\.fillStyle\(0x0f172a, 0\.95\);\n    bg\.fillRoundedRect\(-130, -90, 260, 180, 10\);\n    bg\.lineStyle\(3, 0xf1c40f, 1\);\n    bg\.strokeRoundedRect\(-130, -90, 260, 180, 10\);/g;

file = file.replace(regex, `    bg.fillStyle(0x064e3b, 1);
    bg.fillRect(-160, -120, 320, 240);
    bg.lineStyle(2, 0xf1c40f, 1);
    bg.strokeRect(-156, -116, 312, 232);
    bg.fillStyle(0x0f172a, 0.95);
    bg.fillRoundedRect(-130, -90, 260, 180, 10);
    bg.lineStyle(3, 0xf1c40f, 1);
    bg.strokeRoundedRect(-130, -90, 260, 180, 10);`);

fs.writeFileSync('src/game/WhotScene.ts', file);
