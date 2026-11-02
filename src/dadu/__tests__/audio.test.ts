import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MIXER, allowedSpeeds, ambienceFor, effectiveVolume } from '../audio/mixer';

test('music and ambience duck under voice; sfx do not; mute silences all', () => {
  assert.equal(effectiveVolume(DEFAULT_MIXER, 'music', false), 0.5);
  assert.equal(effectiveVolume(DEFAULT_MIXER, 'music', true), 0.125);
  assert.equal(effectiveVolume(DEFAULT_MIXER, 'sfx', true), 0.8);
  assert.equal(effectiveVolume({ ...DEFAULT_MIXER, muted: true }, 'voice', false), 0);
  assert.equal(effectiveVolume({ ...DEFAULT_MIXER, reducedAudio: true }, 'ambience', false), 0);
});

test('ambience and speed rules', () => {
  assert.equal(ambienceFor('garden', 'morning', 'rainy'), 'garden.rain');
  assert.equal(ambienceFor('garden', 'night', 'sunny'), 'garden.night');
  assert.deepEqual(allowedSpeeds('A1'), ['verySlow', 'slow', 'normal']);
  assert.equal(allowedSpeeds('A4').length, 5);
});
