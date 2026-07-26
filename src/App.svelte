<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Phaser from 'phaser';
  import { createPhaserGame } from './game/PhaserGame';
  import { WhotScene } from './game/WhotScene';

  let game: Phaser.Game | null = null;
  let soundEnabled = true;

  let settings = {
    sfx: true,
    aiBanter: true,
    whotCard: true,
    pick3: true,
    suspend: true,
    emptyMarketEnds: false
  };

  // Simulator Customization
  let currentSkin: 'charcoal' | 'yellow' | 'naija' | 'neon' = 'charcoal';
  let ledBacklight: 'cyan' | 'green' | 'amber' | 'off' = 'cyan';
  let keypadTones = true;

  let leftSoftKeyLabel = 'MENU';
  let rightSoftKeyLabel = 'MARKET';

  let focusedSettingIdx = 0;
  const settingKeys = ['sfx', 'aiBanter', 'whotCard', 'pick3', 'suspend', 'emptyMarketEnds'];

  // Button pressed states for visual active feedback
  let pressedSimKeys: Record<string, boolean> = {
    lsk: false, rsk: false, call: false, end: false,
    up: false, down: false, left: false, right: false, ok: false,
    k1: false, k2: false, k3: false, k4: false, k5: false,
    k6: false, k7: false, k8: false, k9: false, k0: false,
    kStar: false, kHash: false
  };

  const keys = [
    { num: '1', chars: 'CIRCLE' },
    { num: '2', chars: 'TRIANGLE' },
    { num: '3', chars: 'CROSS' },
    { num: '4', chars: 'SQUARE' },
    { num: '5', chars: 'STAR' },
    { num: '6', chars: 'MNO' },
    { num: '7', chars: 'PQRS' },
    { num: '8', chars: 'TUV' },
    { num: '9', chars: 'WXYZ' },
    { num: '*', chars: 'INFO' },
    { num: '0', chars: '_ [Space]' },
    { num: '#', chars: 'MUTE' }
  ];

  const skins = [
    { id: 'charcoal', name: 'Carbon Grey', colorClass: 'charcoal' },
    { id: 'yellow', name: 'Lagos Danfo', colorClass: 'yellow' },
    { id: 'naija', name: 'Green White', colorClass: 'naija' },
    { id: 'neon', name: 'Neo-Lagos', colorClass: 'neon' }
  ] as const;

  const leds = [
    { id: 'cyan', name: 'Electric Cyan' },
    { id: 'green', name: 'Toxic Green' },
    { id: 'amber', name: 'Retro Amber' },
    { id: 'off', name: 'Glow Off' }
  ] as const;

  const lskLabel = "BACK";
  const rskLabel = "";
  let isPlaying = false;
  let timer: any = null;
  let screenFrameEl: HTMLElement | null = null;

  function updateScale() {
    if (!screenFrameEl) {
      screenFrameEl = document.querySelector('.screen-frame');
    }
    if (!screenFrameEl) return;
    const rect = screenFrameEl.getBoundingClientRect();
    screenFrameEl.style.setProperty('--screen-height', `${rect.height}px`);
  }

  function loadSettings() {
    const raw = localStorage.getItem('naija_whot_settings_hd');
    if (raw) {
      try {
        settings = { ...settings, ...JSON.parse(raw) };
        soundEnabled = settings.sfx;
      } catch (e) {
        // ignore
      }
    }
    currentSkin = (localStorage.getItem('naija_whot_skin') || 'charcoal') as any;
    ledBacklight = (localStorage.getItem('naija_whot_led') || 'cyan') as any;
    keypadTones = localStorage.getItem('naija_whot_tones') !== 'false';
  }

  function saveSettings() {
    localStorage.setItem('naija_whot_settings_hd', JSON.stringify(settings));
    if (game) game.sound.mute = !settings.sfx;
    soundEnabled = settings.sfx;

    const scene = getActiveScene();
    if (scene) scene.handleSettingsChanged();
  }

  onMount(() => {
    loadSettings();
    updateScale();
    window.addEventListener('resize', updateScale);
    // Periodically ensure scaling is correct
    const scaleCheckInterval = setInterval(updateScale, 1000);

    Promise.all([
      document.fonts.load('10px "Luckiest Guy"'),
      document.fonts.load('10px "Baloo Chettan"'),
      fetch('/sounds_base64.json').then(r => r.json()).catch(err => { console.warn(err); return {}; }),
      fetch('/assets_base64.json').then(r => r.json()).catch(err => { console.warn(err); return {}; })
    ]).then(([font1, font2, sounds, assets]) => {
      (window as any).soundData = sounds;
      (window as any).assetData = assets;
      game = createPhaserGame('phaser-container');
      setTimeout(updateScale, 100);
    });
    timer = setInterval(() => {
      const scene = getActiveScene();
      if (scene) {
        if (typeof scene.getLeftSoftKeyLabel === 'function') {
          leftSoftKeyLabel = scene.getLeftSoftKeyLabel() || 'MENU';
        }
        if (typeof scene.getRightSoftKeyLabel === 'function') {
          rightSoftKeyLabel = scene.getRightSoftKeyLabel() || 'MARKET';
        }
        if (scene.currentTurn && scene.currentTurn !== 'MENU' && scene.currentTurn !== ('RULES' as any) && scene.currentTurn !== ('SETTINGS' as any) && scene.currentTurn !== ('LOADING' as any)) {
          isPlaying = true;
        } else {
          isPlaying = false;
        }
      }
    }, 100);

    return () => {
      clearInterval(scaleCheckInterval);
    };
  });

  onDestroy(() => {
    if (timer) clearInterval(timer);
    if (game) {
      game.destroy(true);
      game = null;
    }
    window.removeEventListener('resize', updateScale);
  });

  function getActiveScene(): WhotScene | null {
    if (!game) return null;
    return game.scene.getScene('WhotScene') as WhotScene;
  }

  function sendLeft() {
    const scene = getActiveScene();
    if (scene) scene.handleInputLeft();
  }

  function sendRight() {
    const scene = getActiveScene();
    if (scene) scene.handleInputRight();
  }

  function sendOk() {
    const scene = getActiveScene();
    if (scene) scene.handleInputOk();
  }

  function sendMarket() {
    const scene = getActiveScene();
    if (scene) scene.handleMarketDrawAttempt();
  }

  function toggleRules() {
    showRulesModal = !showRulesModal;
    playClickSound();
  }

  function toggleSettings() {
    showSettingsModal = !showSettingsModal;
    playClickSound();
  }

  function playClickSound() {
    const scene = getActiveScene();
    if (scene) scene.playSound('sfx_btn_click');
  }

  function playBeep(frequency = 440, duration = 0.08) {
    if (!keypadTones || !soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // ignore
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    updateKeyState(event.key, event.code, true);
    handleGlobalKeyDown(event);
  }

  function handleKeyUp(event: KeyboardEvent) {
    updateKeyState(event.key, event.code, false);
  }

  function updateKeyState(key: string, code: string, isPressed: boolean) {
    const k = key.toLowerCase();
    if (key === 'ArrowLeft' || k === 'a') pressedSimKeys.left = isPressed;
    else if (key === 'ArrowRight' || k === 'd') pressedSimKeys.right = isPressed;
    else if (key === 'ArrowUp' || k === 'w') pressedSimKeys.up = isPressed;
    else if (key === 'ArrowDown' || k === 's') pressedSimKeys.down = isPressed;
    else if (key === 'Enter' || key === ' ' || k === 'q') pressedSimKeys.ok = isPressed;
    else if (key === 'SoftLeft' || key === 'F1' || key === '[') pressedSimKeys.lsk = isPressed;
    else if (key === 'SoftRight' || key === 'F2' || key === ']') pressedSimKeys.rsk = isPressed;
    else if (key === 'Backspace' || key === 'Escape' || k === 'c') pressedSimKeys.end = isPressed;
    else if (k === 'r' || k === 'g') pressedSimKeys.call = isPressed;
    else if (key === '1') pressedSimKeys.k1 = isPressed;
    else if (key === '2') pressedSimKeys.k2 = isPressed;
    else if (key === '3') pressedSimKeys.k3 = isPressed;
    else if (key === '4') pressedSimKeys.k4 = isPressed;
    else if (key === '5') pressedSimKeys.k5 = isPressed;
    else if (key === '6') pressedSimKeys.k6 = isPressed;
    else if (key === '7') pressedSimKeys.k7 = isPressed;
    else if (key === '8') pressedSimKeys.k8 = isPressed;
    else if (key === '9') pressedSimKeys.k9 = isPressed;
    else if (key === '0') pressedSimKeys.k0 = isPressed;
    else if (key === '*') pressedSimKeys.kStar = isPressed;
    else if (key === '#') pressedSimKeys.kHash = isPressed;
  }

  function handleGlobalKeyDown(event: KeyboardEvent) {
    const key = event.key;
    const isLsk = key === 'SoftLeft' || key === 'F1' || event.keyCode === 113 || key === '[';
    const isRsk = key === 'SoftRight' || key === 'F2' || event.keyCode === 114 || key === ']';
    const isBack = key === 'Backspace' || key === 'Escape' || event.keyCode === 8 || key.toLowerCase() === 'c';
    const isEnter = key === 'Enter' || key === 'Select' || key === ' ' || event.keyCode === 13 || key.toLowerCase() === 'q';

    const isKaiOS = typeof navigator !== 'undefined' && /KaiOS|KAIOS/i.test(navigator.userAgent);

    if (isLsk) {
      event.preventDefault();
      event.stopPropagation();
      clickLsk();
    } else if (isRsk) {
      event.preventDefault();
      event.stopPropagation();
      clickRsk();
    } else if (key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      const scene = getActiveScene();
      if (scene) {
        if (isKaiOS) {
          scene.handleInputLeft(); // Physical Up -> Screen Left (90 deg CCW)
        } else {
          scene.handleInputUp();   // Standard Up
        }
      }
      playBeep(520);
    } else if (key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      const scene = getActiveScene();
      if (scene) {
        if (isKaiOS) {
          scene.handleInputRight(); // Physical Down -> Screen Right (90 deg CCW)
        } else {
          scene.handleInputDown();  // Standard Down
        }
      }
      playBeep(400);
    } else if (key === 'ArrowLeft') {
      event.preventDefault();
      event.stopPropagation();
      const scene = getActiveScene();
      if (scene) {
        if (isKaiOS) {
          scene.handleInputDown(); // Physical Left -> Screen Down (90 deg CCW)
        } else {
          scene.handleInputLeft();  // Standard Left
        }
      }
      playBeep(450);
    } else if (key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      const scene = getActiveScene();
      if (scene) {
        if (isKaiOS) {
          scene.handleInputUp(); // Physical Right -> Screen Up (90 deg CCW)
        } else {
          scene.handleInputRight(); // Standard Right
        }
      } else {
        sendMarket();
      }
      playBeep(450);
    } else if (isEnter) {
      event.preventDefault();
      event.stopPropagation();
      const scene = getActiveScene();
      if (scene) {
        scene.handleInputOk();
      }
      playBeep(700);
    } else if (isBack) {
      event.preventDefault();
      event.stopPropagation();
      const scene = getActiveScene();
      if (scene) {
        scene.returnToMainMenu();
      }
    }
  }

  function triggerButtonPulse(keyId: string) {
    pressedSimKeys[keyId] = true;
    setTimeout(() => { pressedSimKeys[keyId] = false; }, 120);
  }

  function clickLsk() {
    triggerButtonPulse('lsk');
    playClickSound();
    playBeep(600);
    const scene = getActiveScene();
    if (!scene) return;
    if (isPlaying) {
      scene.showMainMenu();
      scene.showToast('GAME PAUSED', '#f1c40f');
    } else {
      scene.returnToMainMenu();
    }
  }

  function clickRsk() {
    triggerButtonPulse('rsk');
    playClickSound();
    playBeep(600);
    const scene = getActiveScene();
    if (!scene) return;
    if (isPlaying) {
      scene.handleMarketDrawAttempt();
    }
  }

  function clickCall() {
    triggerButtonPulse('call');
    playClickSound();
    playBeep(880, 0.15);
    const scene = getActiveScene();
    if (scene) {
      scene.startNewGame();
      scene.showToast("NEW GAME DEALT! 🎴", "#2ecc71");
    }
  }

  function clickEnd() {
    triggerButtonPulse('end');
    playClickSound();
    playBeep(300, 0.15);
    const scene = getActiveScene();
    if (scene) {
      scene.returnToMainMenu();
      scene.showToast("RETURNED TO MENU 🏠", "#e74c3c");
    }
  }

  function clickLeft() {
    triggerButtonPulse('left');
    playClickSound();
    playBeep(450);
    sendLeft();
  }

  function clickRight() {
    triggerButtonPulse('right');
    playClickSound();
    playBeep(450);
    sendRight();
  }

  function clickUp() {
    triggerButtonPulse('up');
    playClickSound();
    playBeep(520);
    const scene = getActiveScene();
    if (scene) {
      scene.handleInputUp();
    } else {
      sendMarket();
    }
  }

  function clickDown() {
    triggerButtonPulse('down');
    playClickSound();
    playBeep(400);
    const scene = getActiveScene();
    if (scene) {
      scene.handleInputDown();
    }
  }

  function clickOkBtn() {
    triggerButtonPulse('ok');
    playClickSound();
    playBeep(700);
    const scene = getActiveScene();
    if (scene) {
      scene.handleInputOk();
    } else {
      sendOk();
    }
  }

  function clickNumeric(num: string) {
    let keyId = 'k' + num;
    if (num === '*') keyId = 'kStar';
    if (num === '#') keyId = 'kHash';
    triggerButtonPulse(keyId);

    const freqMap: Record<string, number> = {
      '1': 523, '2': 587, '3': 659, '4': 698, '5': 784, '6': 880,
      '7': 988, '8': 1047, '9': 1175, '0': 440, '*': 349, '#': 392
    };
    playBeep(freqMap[num] || 500);
    playClickSound();

    const scene = getActiveScene();
    if (scene && scene.currentTurn === 'WHOT_SELECT') {
      const suits: any[] = ['circle', 'triangle', 'cross', 'square', 'star'];
      const val = parseInt(num, 10);
      if (val >= 1 && val <= 5) {
        scene.selectWhotSuit(suits[val - 1]);
      }
    } else if (scene && scene.currentTurn === 'VALID_SELECT') {
      const val = parseInt(num, 10);
      if (!isNaN(val) && val >= 1) {
        scene.selectValidCardByNumber(val);
      }
    } else if (scene) {
      if (num === '*') {
        scene.showToast("Naija Whot v1.0.0", "#3498db");
      } else if (num === '#') {
        settings.sfx = !settings.sfx;
        saveSettings();
        scene.showToast(soundEnabled ? "SOUND ON" : "MUTE", "#9b59b6");
      } else {
        const banters = [
          "Oya play your card!", "Check your hand well o!", "General Market is calling you!",
          "No go play card when you no get!", "Retro KaiOS Experience!", "Whot card is wild!",
          "Hold On! Play again!", "Pick Two or Draw!", "Don't lose your focus!"
        ];
        scene.showToast(banters[parseInt(num, 10) % banters.length], "#f39c12");
      }
    }
  }

  function changeSkin(skin: typeof currentSkin) {
    currentSkin = skin;
    localStorage.setItem('naija_whot_skin', skin);
    playBeep(500);
  }

  function changeLed(led: typeof ledBacklight) {
    ledBacklight = led;
    localStorage.setItem('naija_whot_led', led);
    playBeep(600);
  }

  function toggleTones() {
    keypadTones = !keypadTones;
    localStorage.setItem('naija_whot_tones', keypadTones ? 'true' : 'false');
    playBeep(650);
  }
</script>

<svelte:window on:keydown={handleKeyDown} on:keyup={handleKeyUp} />

<div class="simulator-workspace">
  <div class="phone-simulator-container">
    <div class="device-chassis skin-{currentSkin}">
      <div class="device-earpiece">
        <div class="earpiece-speaker"></div>
        <div class="device-brand">NAIJA 3310</div>
        <div class="camera-lens"></div>
      </div>

      <div class="screen-outer-bezel">
        <div class="screen-frame">
          <div class="screen-glass-glare"></div>
          <div id="phaser-container" class="phaser-screen"></div>

          <div class="virtual-softkey-bar">
            <div class="virtual-softkey left">{leftSoftKeyLabel}</div>
            <div class="virtual-softkey right" class:penalty={rightSoftKeyLabel.startsWith('PICK') || rightSoftKeyLabel.startsWith('GEN')}>{rightSoftKeyLabel}</div>
          </div>
        </div>
      </div>

      <div class="physical-keypad led-{ledBacklight}">
        <div class="key-row softkeys-row">
          <button class="key-softkey left-softkey" class:active={pressedSimKeys.lsk} on:mousedown={clickLsk}>
            <span class="key-label-char">─</span>
            <span class="key-sub-label">{leftSoftKeyLabel}</span>
          </button>
          <button class="key-softkey right-softkey" class:active={pressedSimKeys.rsk} on:mousedown={clickRsk}>
            <span class="key-label-char">─</span>
            <span class="key-sub-label">{rightSoftKeyLabel}</span>
          </button>
        </div>

        <div class="navigation-controls-group">
          <button class="key-call-btn call-green" class:active={pressedSimKeys.call} on:mousedown={clickCall}>
            <span class="key-icon">📞</span>
            <span class="key-sub-label">Deal</span>
          </button>

          <div class="dpad-container">
            <button class="dpad-arrow dpad-arrow-up" class:active={pressedSimKeys.up} on:mousedown={clickUp}>▲</button>
            <button class="dpad-arrow dpad-arrow-left" class:active={pressedSimKeys.left} on:mousedown={clickLeft}>◀</button>
            <button class="dpad-center-ok" class:active={pressedSimKeys.ok} on:mousedown={clickOkBtn}>
              <span class="ok-text">OK</span>
            </button>
            <button class="dpad-arrow dpad-arrow-right" class:active={pressedSimKeys.right} on:mousedown={clickRight}>▶</button>
            <button class="dpad-arrow dpad-arrow-down" class:active={pressedSimKeys.down} on:mousedown={clickDown}>▼</button>
          </div>

          <button class="key-call-btn end-red" class:active={pressedSimKeys.end} on:mousedown={clickEnd}>
            <span class="key-icon">🔴</span>
            <span class="key-sub-label">Back</span>
          </button>
        </div>

        <div class="t9-grid-container">
          {#each keys as key}
            {@const keyId = key.num === '*' ? 'kStar' : key.num === '#' ? 'kHash' : 'k' + key.num}
            <button class="t9-btn" class:active={pressedSimKeys[keyId]} on:mousedown={() => clickNumeric(key.num)}>
              <div class="t9-num">{key.num}</div>
              <div class="t9-chars">{key.chars}</div>
            </button>
          {/each}
        </div>
      </div>
    </div>
  </div>

  <div class="control-desk-panel">
    <div class="desk-card">
      <div class="desk-header">
        <h2>Naija Whot Desk</h2>
        <span class="desk-badge">Config</span>
      </div>

      <div class="desk-section">
        <h3>1. SIMULATOR CHASSIS SKIN</h3>
        <div class="skin-selector-grid">
          {#each skins as skin}
            <button class="skin-btn" class:selected={currentSkin === skin.id} on:click={() => changeSkin(skin.id)}>
              <div class="dot-color {skin.colorClass}"></div>
              <span>{skin.name}</span>
            </button>
          {/each}
        </div>
      </div>

      <div class="desk-section">
        <h3>2. LED KEYPAD BACKLIGHT</h3>
        <div class="backlight-selector-grid">
          {#each leds as led}
            <button class="led-btn glow-{led.id}" class:selected={ledBacklight === led.id} on:click={() => changeLed(led.id)}>
              {led.name}
            </button>
          {/each}
        </div>
      </div>

      <div class="desk-section">
        <div class="toggle-row">
          <div class="toggle-label-group">
            <span class="toggle-title">Classic T9 Keypad Tones</span>
            <span class="toggle-desc">Synthesize retro beeps on key press</span>
          </div>
          <button class="toggle-action-btn" class:enabled={keypadTones} on:click={toggleTones}>
            {keypadTones ? "ENABLED" : "DISABLED"}
          </button>
        </div>
      </div>

      <div class="desk-section mapping-guide">
        <h3>KEYBOARD SHORTCUTS</h3>
        <div class="shortcuts-grid">
          <div class="shortcut-item">
            <kbd>&larr;</kbd> <kbd>&rarr;</kbd> / <kbd>A</kbd> <kbd>D</kbd>
            <span>D-Pad Left/Right (Select Card)</span>
          </div>
          <div class="shortcut-item">
            <kbd>&uarr;</kbd> / <kbd>W</kbd> / <kbd>M</kbd>
            <span>D-Pad Up (Market Draw Card)</span>
          </div>
          <div class="shortcut-item">
            <kbd>Enter</kbd> / <kbd>Space</kbd> / <kbd>Q</kbd>
            <span>D-Pad OK (Play Card)</span>
          </div>
          <div class="shortcut-item">
            <kbd>SoftLeft</kbd> / <kbd>[</kbd>
            <span>Soft Left Key (Rules/Menu)</span>
          </div>
          <div class="shortcut-item">
            <kbd>SoftRight</kbd> / <kbd>]</kbd>
            <span>Soft Right Key (Settings/Market)</span>
          </div>
          <div class="shortcut-item">
            <kbd>1</kbd> - <kbd>5</kbd>
            <span>Suit Call selection</span>
          </div>
          <div class="shortcut-item">
            <kbd>Backspace</kbd> / <kbd>Esc</kbd> / <kbd>C</kbd>
            <span>Red Button (Go Back/Reset)</span>
          </div>
        </div>
      </div>

      <div class="desk-section logs-section">
        <h3>🔴 KEY INPUT MONITOR</h3>
        <div class="logs-console">
          <div class="live-lights">
            <span class="light-indicator" class:active={pressedSimKeys.left}>L</span>
            <span class="light-indicator" class:active={pressedSimKeys.up}>U</span>
            <span class="light-indicator" class:active={pressedSimKeys.down}>D</span>
            <span class="light-indicator" class:active={pressedSimKeys.right}>R</span>
            <span class="light-indicator" class:active={pressedSimKeys.ok}>OK</span>
            <span class="light-indicator" class:active={pressedSimKeys.lsk}>LSK</span>
            <span class="light-indicator" class:active={pressedSimKeys.rsk}>RSK</span>
            <span class="light-indicator font-mono" class:active={pressedSimKeys.k1}>1</span>
            <span class="light-indicator font-mono" class:active={pressedSimKeys.k2}>2</span>
            <span class="light-indicator font-mono" class:active={pressedSimKeys.k3}>3</span>
            <span class="light-indicator font-mono" class:active={pressedSimKeys.k4}>4</span>
            <span class="light-indicator font-mono" class:active={pressedSimKeys.k5}>5</span>
          </div>
          <div class="log-status">
            {#if Object.values(pressedSimKeys).some(v => v)}
              <span class="text-green-400 font-semibold text-xs">Pressing...</span>
            {:else}
              <span class="text-slate-500 font-semibold text-xs">Ready</span>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  :global(body) {
    background-color: #050508;
    margin: 0;
    padding: 0;
    overflow-x: hidden;
    font-family: 'Luckiest Guy', 'Baloo Chettan', var(--font-sans);
  }

  .simulator-workspace {
    min-height: 100vh;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    background-color: #07070d;
    background-image: radial-gradient(circle at 50% 50%, #151530 0%, #06060d 100%);
    padding: 1.5rem;
    gap: 2.5rem;
    user-select: none;
  }

  .phone-simulator-container {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Phone Chassis Frame */
  .device-chassis {
    width: 335px;
    height: 650px;
    border-radius: 32px;
    padding: 1.25rem 1.1rem 1.5rem 1.1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    box-shadow: 
      0 25px 50px -12px rgba(0, 0, 0, 0.85),
      inset 0 2px 4px rgba(255, 255, 255, 0.2);
    position: relative;
    transition: all 0.3s ease;
    border: 4px solid #2e2f38;
  }

  /* SKINS styling */
  .skin-charcoal {
    background: linear-gradient(145deg, #1e2025 0%, #111215 100%);
    border-color: #2e313a;
  }
  .skin-charcoal .screen-outer-bezel {
    background-color: #0a0a0c;
    border: 2px solid #25272f;
  }
  .skin-charcoal .key-softkey,
  .skin-charcoal .t9-btn {
    background: linear-gradient(135deg, #2a2d35 0%, #181a1f 100%);
    color: #cbd5e1;
    border: 1px solid #3b3f4c;
    box-shadow: 0 3px 0 #101114, inset 0 1px 1px rgba(255,255,255,0.08);
  }
  .skin-charcoal .key-softkey:active,
  .skin-charcoal .t9-btn:active,
  .skin-charcoal .key-softkey.active,
  .skin-charcoal .t9-btn.active {
    background: #181a1f;
    box-shadow: 0 1px 0 #101114, inset 0 1px 4px rgba(0,0,0,0.4);
    transform: translateY(2px);
  }
  .skin-charcoal .dpad-container {
    background-color: #121316;
    border: 2px solid #2c2f37;
  }
  .skin-charcoal .dpad-arrow {
    background: #1e2025;
    color: #94a3b8;
  }
  .skin-charcoal .dpad-center-ok {
    background: linear-gradient(135deg, #f1c40f 0%, #d4ac0d 100%);
    color: #000;
  }

  .skin-yellow {
    background: linear-gradient(145deg, #f39c12 0%, #f1c40f 100%);
    border-color: #000;
  }
  .skin-yellow .device-brand {
    color: #000000 !important;
  }
  .skin-yellow .screen-outer-bezel {
    background-color: #000;
    border: 2px solid #111;
  }
  .skin-yellow .key-softkey,
  .skin-yellow .t9-btn {
    background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%);
    color: #f1c40f;
    border: 1px solid #34495e;
    box-shadow: 0 3px 0 #0f171e;
  }
  .skin-yellow .key-softkey:active,
  .skin-yellow .t9-btn:active,
  .skin-yellow .key-softkey.active,
  .skin-yellow .t9-btn.active {
    background: #0f171e;
    box-shadow: 0 1px 0 #0a0e12;
    transform: translateY(2px);
  }
  .skin-yellow .dpad-container {
    background-color: #000;
    border: 2px solid #111;
  }
  .skin-yellow .dpad-arrow {
    background: #2c3e50;
    color: #f1c40f;
  }
  .skin-yellow .dpad-center-ok {
    background: #f1c40f;
    color: #000;
  }

  .skin-naija {
    background: linear-gradient(145deg, #27ae60 0%, #1e8449 45%, #ffffff 45%, #ffffff 55%, #1e8449 55%, #27ae60 100%);
    border-color: #115c2e;
  }
  .skin-naija .screen-outer-bezel {
    background-color: #0a2512;
    border: 2px solid #155026;
  }
  .skin-naija .key-softkey,
  .skin-naija .t9-btn {
    background: linear-gradient(135deg, #ffffff 0%, #f1f1f1 100%);
    color: #1e8449;
    border: 1px solid #cbd5e1;
    box-shadow: 0 3px 0 #115c2e, inset 0 1px 1px rgba(255,255,255,1);
  }
  .skin-naija .key-softkey:active,
  .skin-naija .t9-btn:active,
  .skin-naija .key-softkey.active,
  .skin-naija .t9-btn.active {
    background: #e2e8f0;
    box-shadow: 0 1px 0 #115c2e;
    transform: translateY(2px);
  }
  .skin-naija .dpad-container {
    background-color: #0e3019;
    border: 2px solid #1c5c32;
  }
  .skin-naija .dpad-arrow {
    background: #ffffff;
    color: #1e8449;
  }
  .skin-naija .dpad-center-ok {
    background: #27ae60;
    color: #ffffff;
  }

  .skin-neon {
    background: linear-gradient(145deg, #2e0854 0%, #120324 100%);
    border-color: #f107a3;
  }
  .skin-neon .device-brand {
    color: #00ffff !important;
    text-shadow: 0 0 8px #00ffff;
  }
  .skin-neon .screen-outer-bezel {
    background-color: #110222;
    border: 2px solid #f107a3;
  }
  .skin-neon .key-softkey,
  .skin-neon .t9-btn {
    background: linear-gradient(135deg, #3c1053 0%, #1c0528 100%);
    color: #00ffff;
    border: 1px solid #f107a3;
    box-shadow: 0 3px 0 #800080, 0 0 4px rgba(241,7,163,0.3);
  }
  .skin-neon .key-softkey:active,
  .skin-neon .t9-btn:active,
  .skin-neon .key-softkey.active,
  .skin-neon .t9-btn.active {
    background: #220330;
    box-shadow: 0 1px 0 #800080;
    transform: translateY(2px);
  }
  .skin-neon .dpad-container {
    background-color: #19012b;
    border: 2px solid #f107a3;
  }
  .skin-neon .dpad-arrow {
    background: #25023d;
    color: #f107a3;
  }
  .skin-neon .dpad-center-ok {
    background: #00ffff;
    color: #000;
  }

  .device-earpiece {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 0.5rem;
    margin-bottom: 0.6rem;
  }

  .earpiece-speaker {
    width: 50px;
    height: 5px;
    background-color: #15161b;
    border-radius: 3px;
  }

  .device-brand {
    font-weight: 900;
    font-size: 0.85rem;
    letter-spacing: 0.12em;
    color: #cbd5e1;
    font-family: 'Luckiest Guy', 'Baloo Chettan', sans-serif;
  }

  .camera-lens {
    width: 8px;
    height: 8px;
    background-color: #0a0a0d;
    border-radius: 50%;
  }

  .screen-outer-bezel {
    padding: 0.65rem;
    border-radius: 12px;
    margin-bottom: 0.75rem;
  }

  .screen-frame {
    width: 320px;
    height: 240px;
    background-color: #064e3b;
    border-radius: 4px;
    overflow: hidden;
    position: relative;
    box-sizing: border-box;
  }

  .phaser-screen {
    width: 320px;
    height: 240px;
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
    border-top: none;
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

  .virtual-softkey.center {
    color: #fff;
    background-color: rgba(37, 99, 235, 0.85);
    padding: 0 6px;
    border-radius: 2px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  }

  .physical-keypad {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .softkeys-row {
    padding: 0 0.25rem;
    gap: 1.25rem;
    display: flex;
    justify-content: space-between;
  }

  .key-softkey {
    flex: 1;
    height: 30px;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    outline: none;
  }

  .key-label-char {
    font-size: 0.9rem;
    font-weight: bold;
    line-height: 0.6;
  }

  .key-sub-label {
    font-size: 0.55rem;
    font-weight: 700;
    text-transform: uppercase;
    opacity: 0.7;
  }

  .navigation-controls-group {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 0;
    height: 90px;
  }

  .key-call-btn {
    width: 40px;
    height: 42px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    outline: none;
    border: 1px solid;
    transition: transform 0.05s;
  }

  .call-green {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    border-color: #047857;
    box-shadow: 0 3px 0 #04523a;
  }
  .call-green:active, .call-green.active {
    background: #047857;
    box-shadow: 0 1px 0 #04523a;
    transform: translateY(2px);
  }

  .end-red {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    border-color: #b91c1c;
    box-shadow: 0 3px 0 #7f1d1d;
  }
  .end-red:active, .end-red.active {
    background: #b91c1c;
    box-shadow: 0 1px 0 #7f1d1d;
    transform: translateY(2px);
  }

  .key-icon { font-size: 0.95rem; }

  /* DPad */
  .dpad-container {
    width: 90px;
    height: 90px;
    border-radius: 50%;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 8px rgba(0,0,0,0.4);
  }

  .dpad-arrow {
    position: absolute;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    cursor: pointer;
    outline: none;
    background-color: transparent;
  }

  .dpad-arrow-up { top: 3px; width: 38px; height: 22px; border-radius: 8px 8px 0 0; }
  .dpad-arrow-down { bottom: 3px; width: 38px; height: 22px; border-radius: 0 0 8px 8px; }
  .dpad-arrow-left { left: 3px; width: 22px; height: 38px; border-radius: 8px 0 0 8px; }
  .dpad-arrow-right { right: 3px; width: 22px; height: 38px; border-radius: 0 8px 8px 0; }
  .dpad-arrow:active, .dpad-arrow.active { background-color: rgba(255, 255, 255, 0.12) !important; }

  .dpad-center-ok {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: none;
    z-index: 2;
    cursor: pointer;
    outline: none;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.5);
    font-weight: 900;
    font-size: 0.72rem;
  }
  .dpad-center-ok:active, .dpad-center-ok.active {
    transform: scale(0.92);
  }

  .t9-grid-container {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.4rem;
    width: 100%;
  }

  .t9-btn {
    height: 38px;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    outline: none;
  }

  .t9-num {
    font-size: 1.05rem;
    font-weight: 800;
    line-height: 0.9;
  }

  .t9-chars {
    font-size: 0.42rem;
    font-weight: bold;
    opacity: 0.65;
    margin-top: -1px;
    white-space: nowrap;
  }

  /* LED Glow Backlights */
  .led-cyan .t9-btn, .led-cyan .key-softkey {
    text-shadow: 0 0 3px rgba(0, 255, 255, 0.5);
    box-shadow: 0 3px 0 #101114, 0 0 4px rgba(0, 255, 255, 0.15);
  }
  .led-cyan .t9-btn.active, .led-cyan .key-softkey.active {
    text-shadow: 0 0 6px rgba(0, 255, 255, 0.85);
    box-shadow: 0 1px 0 #101114, 0 0 10px rgba(0, 255, 255, 0.55) !important;
  }

  .led-green .t9-btn, .led-green .key-softkey {
    text-shadow: 0 0 3px rgba(46, 204, 113, 0.5);
    box-shadow: 0 3px 0 #101114, 0 0 4px rgba(46, 204, 113, 0.15);
  }
  .led-green .t9-btn.active, .led-green .key-softkey.active {
    text-shadow: 0 0 6px rgba(46, 204, 113, 0.85);
    box-shadow: 0 1px 0 #101114, 0 0 10px rgba(46, 204, 113, 0.55) !important;
  }

  .led-amber .t9-btn, .led-amber .key-softkey {
    text-shadow: 0 0 3px rgba(243, 156, 18, 0.5);
    box-shadow: 0 3px 0 #101114, 0 0 4px rgba(243, 156, 18, 0.15);
  }
  .led-amber .t9-btn.active, .led-amber .key-softkey.active {
    text-shadow: 0 0 6px rgba(243, 156, 18, 0.85);
    box-shadow: 0 1px 0 #101114, 0 0 10px rgba(243, 156, 18, 0.55) !important;
  }

  /* Control Desk Side Panel */
  .control-desk-panel {
    width: 380px;
    display: flex;
    flex-direction: column;
  }

  .desk-card {
    background-color: #0f1016;
    border: 2px solid #1e202d;
    border-radius: 16px;
    padding: 1.25rem;
    box-shadow: 0 15px 30px rgba(0,0,0,0.5);
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }

  .desk-header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    border-bottom: 2px solid #1e202d;
    padding-bottom: 0.6rem;
  }

  .title-flag { font-size: 1.3rem; }
  .desk-header h2 {
    font-size: 1.05rem;
    font-weight: 800;
    color: #f1c40f;
    margin: 0;
    flex-grow: 1;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .desk-badge {
    background-color: #1a1c27;
    border: 1px solid #2e3247;
    color: #38bdf8;
    padding: 0.15rem 0.5rem;
    font-size: 0.6rem;
    border-radius: 4px;
    font-weight: bold;
  }

  .desk-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .desk-section h3 {
    font-size: 0.7rem;
    font-weight: 800;
    color: #94a3b8;
    margin: 0;
    letter-spacing: 0.05em;
  }

  .skin-selector-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.4rem;
  }

  .skin-btn {
    background-color: #141622;
    border: 1px solid #25283b;
    border-radius: 8px;
    padding: 0.5rem 0.65rem;
    color: #94a3b8;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.75rem;
    font-weight: 600;
    transition: all 0.15s;
  }

  .skin-btn:hover { border-color: #3b3f5c; color: #f8fafc; }
  .skin-btn.selected { background-color: #1e2235; border-color: #f1c40f; color: #f1c40f; }

  .dot-color {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.15);
  }
  .dot-color.charcoal { background-color: #1e2025; }
  .dot-color.yellow { background-color: #f1c40f; }
  .dot-color.naija { background-color: #27ae60; }
  .dot-color.neon { background-color: #a800d0; }

  .backlight-selector-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.35rem;
  }

  .led-btn {
    background-color: #141622;
    border: 1px solid #25283b;
    border-radius: 6px;
    padding: 0.4rem 0.2rem;
    font-size: 0.65rem;
    font-weight: 700;
    color: #64748b;
    cursor: pointer;
    text-align: center;
    transition: all 0.15s;
  }

  .led-btn.glow-cyan.selected { background-color: #0b222d; border-color: #00ffff; color: #00ffff; }
  .led-btn.glow-green.selected { background-color: #092414; border-color: #2ecc71; color: #2ecc71; }
  .led-btn.glow-amber.selected { background-color: #241909; border-color: #f39c12; color: #f39c12; }
  .led-btn.glow-off.selected { background-color: #1e1f29; border-color: #64748b; color: #cbd5e1; }

  .toggle-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #141622;
    padding: 0.6rem 0.8rem;
    border-radius: 8px;
    border: 1px solid #25283b;
  }

  .toggle-label-group { display: flex; flex-direction: column; }
  .toggle-title { font-weight: 700; font-size: 0.75rem; color: #f8fafc; }
  .toggle-desc { font-size: 0.6rem; color: #64748b; }

  .toggle-action-btn {
    background-color: #2e1d1d;
    border: 1px solid #eb5757;
    color: #eb5757;
    font-size: 0.65rem;
    font-weight: bold;
    padding: 0.3rem 0.6rem;
    border-radius: 4px;
    cursor: pointer;
  }
  .toggle-action-btn.enabled { background-color: #172d1f; border-color: #27ae60; color: #27ae60; }

  .mapping-guide {
    background-color: #141622;
    border: 1px solid #25283b;
    border-radius: 10px;
    padding: 0.75rem;
  }

  .shortcuts-grid {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .shortcut-item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.68rem;
    color: #94a3b8;
  }

  .shortcut-item span { margin-left: auto; font-weight: 500; }

  kbd {
    background-color: #1c1e2d;
    border: 1px solid #3b3f5c;
    border-radius: 4px;
    padding: 0.1rem 0.3rem;
    font-family: monospace;
    font-size: 0.65rem;
    color: #f1c40f;
  }

  .logs-console {
    background-color: #08090d;
    border: 1px solid #1a1c29;
    border-radius: 6px;
    padding: 0.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .live-lights { display: flex; flex-wrap: wrap; gap: 0.3rem; }

  .light-indicator {
    background-color: #1c1d24;
    border: 1px solid #2a2c38;
    color: #475569;
    font-size: 0.58rem;
    font-weight: 800;
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
    text-transform: uppercase;
  }

  .light-indicator.active {
    background-color: #f1c40f;
    border-color: #f1c40f;
    color: #000;
    box-shadow: 0 0 6px #f1c40f;
  }

  .log-status { font-size: 0.6rem; font-weight: bold; text-align: right; }

  /* Modals */
  .modal-backdrop {
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999;
    padding: 1rem;
    backdrop-filter: blur(2px);
  }

  .modal-card {
    background-color: #0f1016;
    border: 2px solid #f1c40f;
    border-radius: 12px;
    width: 100%;
    max-width: 350px;
    padding: 1.25rem;
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.7);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.85rem;
    border-bottom: 1px solid #25283b;
    padding-bottom: 0.4rem;
  }

  .modal-header h2 {
    font-size: 1rem;
    font-weight: 800;
    color: #f1c40f;
    margin: 0;
    text-transform: uppercase;
  }

  .close-btn {
    background: none;
    border: none;
    color: #64748b;
    font-size: 1.3rem;
    cursor: pointer;
  }

  .modal-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    font-size: 0.8rem;
    color: #cbd5e1;
    max-height: 280px;
    overflow-y: auto;
  }

  .rule-group h3 {
    font-size: 0.85rem;
    font-weight: 800;
    color: #38bdf8;
    margin-bottom: 0.4rem;
    text-transform: uppercase;
  }

  .rule-group ul {
    padding-left: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .settings-group { display: flex; flex-direction: column; gap: 0.6rem; }

  .setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #141622;
    padding: 0.55rem 0.75rem;
    border-radius: 8px;
    border: 1px solid #25283b;
  }

  .setting-row.focused {
    border-color: #f1c40f;
    background-color: #1e2235;
    box-shadow: 0 0 8px rgba(241, 196, 15, 0.3);
  }

  .setting-label { display: flex; flex-direction: column; cursor: pointer; max-width: 80%; }
  .setting-title { font-weight: 700; font-size: 0.78rem; color: #f8fafc; }
  .setting-desc { font-size: 0.65rem; color: #64748b; }
  .setting-toggle { width: 1rem; height: 1rem; accent-color: #f1c40f; cursor: pointer; }

  @media (max-width: 840px) {
    .simulator-workspace {
      flex-direction: column;
      padding: 1rem;
      gap: 1.25rem;
    }
    .control-desk-panel { width: 100%; max-width: 380px; }
  }

  @media (max-width: 380px) {
    .simulator-workspace { padding: 0.25rem; background-color: #000; }
    .phone-simulator-container { width: 100vw; }
    .device-chassis { width: 100vw; height: 100vh; border: none; border-radius: 0; padding: 0.4rem; }
    .control-desk-panel { display: none !important; }
  }
</style>
