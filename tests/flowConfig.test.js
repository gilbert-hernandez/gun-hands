import { describe, expect, it } from 'vitest';
import { DISPLAY, FLOW } from '../src/config/index.js';
import { asset } from '../src/assets/manifest.js';

describe('FLOW config', () => {
  it('uses menu art that exists in the manifest', () => {
    const button = asset(FLOW.keys.button);
    expect(button.type).toBe('spritesheet');
    expect(button.frames).toBe(3);
    for (const key of [FLOW.keys.logo, FLOW.keys.titleBg, FLOW.keys.gameOverPanel]) expect(asset(key)).toBeTruthy();
  });

  it('has positive input delays, the GameOver one at least as long as Pause', () => {
    expect(FLOW.pause.inputDelayMs).toBeGreaterThan(0);
    expect(FLOW.gameOver.inputDelayMs).toBeGreaterThanOrEqual(FLOW.pause.inputDelayMs);
  });

  it('dims the pause overlay with an opacity between 0 and 1', () => {
    expect(FLOW.pause.dimAlpha).toBeGreaterThan(0);
    expect(FLOW.pause.dimAlpha).toBeLessThanOrEqual(1);
  });

  it('lays each screen out on screen, top to bottom, in whole pixels', () => {
    const { title, pause, gameOver } = FLOW;
    for (const ys of [
      [title.logoY, title.startY, title.hintY],
      [pause.titleY, pause.resumeY, pause.quitY],
      [gameOver.titleY, gameOver.statsY, gameOver.buttonsY],
    ]) {
      for (const y of ys) {
        expect(Number.isInteger(y)).toBe(true);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(DISPLAY.height);
      }
      expect([...ys].sort((a, b) => a - b)).toEqual(ys);
    }
  });

  it('fits the GameOver title, stats and both buttons inside the panel', () => {
    const panel = asset(FLOW.keys.gameOverPanel);
    const button = asset(FLOW.keys.button);
    const { panelY, titleY, buttonsY, buttonGap } = FLOW.gameOver;
    expect(2 * button.frameWidth + buttonGap).toBeLessThanOrEqual(panel.frameWidth);
    expect(titleY).toBeGreaterThan(panelY - panel.frameHeight / 2);
    expect(buttonsY + button.frameHeight / 2).toBeLessThanOrEqual(panelY + panel.frameHeight / 2);
  });

  it('keeps the Pause buttons from overlapping', () => {
    const button = asset(FLOW.keys.button);
    expect(FLOW.pause.quitY - FLOW.pause.resumeY).toBeGreaterThanOrEqual(button.frameHeight);
  });

  it('puts the version label on screen, below the controls hint', () => {
    const { x, y } = FLOW.title.version;
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThan(DISPLAY.width);
    expect(y).toBeGreaterThan(FLOW.title.hintY);
    expect(y).toBeLessThanOrEqual(DISPLAY.height);
  });
});
