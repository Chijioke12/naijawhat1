const fs = require('fs');
let file = fs.readFileSync('src/game/WhotScene.ts', 'utf8');

const menuRegex = /    bg\.fillStyle\(0x0f1016, 0\.95\);\n    bg\.fillRect\(20, 20, 280, 200\);\n    bg\.lineStyle\(2, 0xf1c40f, 1\);\n    bg\.strokeRect\(20, 20, 280, 200\);/g;

file = file.replace(menuRegex, `    bg.fillStyle(0x064e3b, 1);
    bg.fillRect(0, 0, 320, 240);
    bg.lineStyle(2, 0xf1c40f, 1);
    bg.strokeRect(4, 4, 312, 232);
    bg.fillStyle(0x0f1016, 0.95);
    bg.fillRect(20, 20, 280, 200);
    bg.lineStyle(2, 0xf1c40f, 1);
    bg.strokeRect(20, 20, 280, 200);`);

const rulesRegex = /    bg\.fillStyle\(0x0f1016, 0\.98\);\n    bg\.fillRect\(15, 15, 290, 210\);\n    bg\.lineStyle\(2, 0xf1c40f, 1\);\n    bg\.strokeRect\(15, 15, 290, 210\);/g;

file = file.replace(rulesRegex, `    bg.fillStyle(0x064e3b, 1);
    bg.fillRect(0, 0, 320, 240);
    bg.lineStyle(2, 0xf1c40f, 1);
    bg.strokeRect(4, 4, 312, 232);
    bg.fillStyle(0x0f1016, 0.98);
    bg.fillRect(15, 15, 290, 210);
    bg.lineStyle(2, 0xf1c40f, 1);
    bg.strokeRect(15, 15, 290, 210);`);

fs.writeFileSync('src/game/WhotScene.ts', file);
