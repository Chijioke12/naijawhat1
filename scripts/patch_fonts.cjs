const fs = require('fs');
let file = fs.readFileSync('src/App.svelte', 'utf8');

const regex = /document\.fonts\.ready\.then\(\(\) \=\> \{\n      game = createPhaserGame\('phaser-container'\);\n    \}\);/;

const newCode = `Promise.all([
      document.fonts.load('10px "Luckiest Guy"'),
      document.fonts.load('10px "Baloo Chettan"')
    ]).then(() => {
      game = createPhaserGame('phaser-container');
    });`;

if (regex.test(file)) {
  file = file.replace(regex, newCode);
  fs.writeFileSync('src/App.svelte', file);
  console.log('Success');
} else {
  console.log('Failed to match');
}
