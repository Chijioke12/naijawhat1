import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const appPath = path.resolve('src/App.svelte');
const backupPath = path.resolve('src/App.svelte.bak');

console.log('Starting production build process...');

// 1. Back up src/App.svelte
try {
  fs.copyFileSync(appPath, backupPath);
  console.log('Successfully backed up src/App.svelte to src/App.svelte.bak');
} catch (err) {
  console.error('Failed to create backup of src/App.svelte:', err);
  process.exit(1);
}

try {
  // 2. Read src/App.svelte content
  const content = fs.readFileSync(appPath, 'utf8');

  // Find the closing script tag </script>
  const scriptEndIdx = content.indexOf('</script>');
  if (scriptEndIdx === -1) {
    throw new Error('Could not find </script> tag in App.svelte');
  }

  const scriptBlock = content.slice(0, scriptEndIdx + 9);

  // We also want to keep the <svelte:window> tag
  const svelteWindowMatch = content.match(/<svelte:window[^>]*\/>/);
  const svelteWindowLine = svelteWindowMatch ? svelteWindowMatch[0] : '<svelte:window on:keydown={handleKeyDown} on:keyup={handleKeyUp} />';

  // Construct the clean HTML body
  const cleanHtml = `
${svelteWindowLine}

<div class="production-game-viewport">
  <div class="screen-frame">
    <div class="screen-glass-glare"></div>
    <div id="phaser-container" class="phaser-screen"></div>

    <div class="virtual-softkey-bar">
      <div class="virtual-softkey left">{leftSoftKeyLabel}</div>
      <div class="virtual-softkey right" class:penalty={rightSoftKeyLabel.startsWith('PICK') || rightSoftKeyLabel.startsWith('GEN')}>{rightSoftKeyLabel}</div>
    </div>
  </div>
</div>
`;

  // Construct the clean style block
  const cleanStyle = `
<style>
  :global(html), :global(body) {
    background-color: #050508;
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    font-family: 'Luckiest Guy', 'Baloo Chettan', var(--font-sans);
  }

  .production-game-viewport {
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #050508;
    overflow: hidden;
  }

  .screen-frame {
    width: 100%;
    height: 100%;
    max-width: 100vw;
    max-height: 100vh;
    aspect-ratio: 4 / 3;
    background-color: #064e3b;
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
  }

  .phaser-screen {
    width: 100%;
    height: 100%;
    position: relative;
    background-color: #064e3b;
  }

  .screen-glass-glare {
    position: absolute;
    top: 0; left: 0; right: 0; height: 50%;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.03) 40%, rgba(255, 255, 255, 0) 60%);
    z-index: 10;
    pointer-events: none;
  }

  .virtual-softkey-bar {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: calc(var(--screen-height, 240px) * (20 / 240));
    background-color: transparent;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 calc(var(--screen-height, 240px) * (8 / 240));
    z-index: 5;
    pointer-events: none;
  }

  .virtual-softkey {
    font-size: calc(var(--screen-height, 240px) * (10.4 / 240));
    font-weight: 800;
    color: #f1c40f;
    font-family: 'Luckiest Guy', 'Baloo Chettan', monospace;
    text-transform: uppercase;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95), 0 0 2px rgba(0, 0, 0, 0.95);
  }

  .virtual-softkey.penalty {
    color: #ef4444;
    font-weight: 900;
    animation: softkeyPulse 1s ease-in-out infinite alternate;
  }

  @keyframes softkeyPulse {
    0% { transform: scale(1); opacity: 0.9; }
    100% { transform: scale(1.05); opacity: 1; text-shadow: 0 0 6px #ef4444, 0 1px 3px rgba(0,0,0,0.95); }
  }
</style>
`;

  // Combine them all
  const cleanContent = `${scriptBlock}\n${cleanHtml}\n${cleanStyle}`;

  // 3. Write clean content to src/App.svelte
  fs.writeFileSync(appPath, cleanContent, 'utf8');
  console.log('Successfully stripped simulator UI from src/App.svelte');

  // 4. Run the production build command
  console.log('Running vite build...');
  execSync('vite build', { stdio: 'inherit' });
  console.log('Production build completed successfully!');

} catch (err) {
  console.error('Error occurred during stripped build:', err);
  process.exitCode = 1;
} finally {
  // 5. Restore src/App.svelte from the backup
  if (fs.existsSync(backupPath)) {
    try {
      fs.copyFileSync(backupPath, appPath);
      fs.unlinkSync(backupPath);
      console.log('Successfully restored src/App.svelte from backup');
    } catch (err) {
      console.error('Failed to restore src/App.svelte from backup:', err);
    }
  }
}
