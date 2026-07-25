const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const DIST_DIR = path.join(__dirname, '../dist');
const OUTPUT_ZIP = path.join(__dirname, '../naijawhat.zip');

if (!fs.existsSync(DIST_DIR)) {
  console.error('dist directory does not exist! Run build first.');
  process.exit(1);
}

console.log('Creating application.zip from dist folder...');
const appZip = new AdmZip();
appZip.addLocalFolder(DIST_DIR);
const appZipBuffer = appZip.toBuffer();

console.log('Creating naijawhat.zip (OmniSD package)...');
const omniZip = new AdmZip();

// 1. Add application.zip
omniZip.addFile('application.zip', appZipBuffer);

// 2. Add update.webapp (empty file or basic json, we provide an empty one as per spec)
omniZip.addFile('update.webapp', Buffer.from(''));

// 3. Add metadata.json
const metadata = {
  version: 1,
  manifestURL: "app://naijawhot/manifest.webapp"
};
omniZip.addFile('metadata.json', Buffer.from(JSON.stringify(metadata, null, 2)));

// Save the outer zip
omniZip.writeZip(OUTPUT_ZIP);
console.log(`Successfully created ${OUTPUT_ZIP} !`);
