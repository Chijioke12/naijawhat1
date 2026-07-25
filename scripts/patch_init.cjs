const fs = require('fs');
let file = fs.readFileSync('src/game/WhotScene.ts', 'utf8');

const regexCreate = /    this\.initGameUI\(\);\n    this\.showLoadingScreen\(\);\n  \}/;
const newCreate = `    this.showLoadingScreen();
  }`;
file = file.replace(regexCreate, newCreate);

const regexFinishLoading = /    const finishLoading = \(\) \=\> \{\n      if \(hasFinishedLoading\) return;\n      hasFinishedLoading = true;\n\n      setTimeout\(\(\) \=\> \{/;
const newFinishLoading = `    const finishLoading = () => {
      if (hasFinishedLoading) return;
      hasFinishedLoading = true;

      this.initGameUI();

      setTimeout(() => {`;
file = file.replace(regexFinishLoading, newFinishLoading);

fs.writeFileSync('src/game/WhotScene.ts', file);
