const fs = require('fs');
let file = fs.readFileSync('src/game/WhotScene.ts', 'utf8');
file = file.replace(/cardContainer\.setDepth\(isSelected \? 100 \: i\);/, 'cardContainer.setDepth(i);');
fs.writeFileSync('src/game/WhotScene.ts', file);
