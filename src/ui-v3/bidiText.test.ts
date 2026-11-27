import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUiDigits, tokenizeBidiText } from './bidiText';

test('normalizeUiDigits unifies Persian and Arabic-Indic numerals to Latin digits and keeps 1v1/2v2 Latin', () => {
  assert.equal(normalizeUiDigits('میدان دوئل ۱v۱ (Duel Arena)'), 'میدان دوئل 1v1 (Duel Arena)');
  assert.equal(normalizeUiDigits('مخصوص ۲V۲ و ۱v۱'), 'مخصوص 2v2 و 1v1');
  assert.equal(normalizeUiDigits('۳ سلاح (3/10)'), '3 سلاح (3/10)');
  assert.equal(normalizeUiDigits('دژ نظامی با ۲ برجک و ٤ سنگر'), 'دژ نظامی با 2 برجک و 4 سنگر');
});

test('tokenizeBidiText isolates English parentheticals as atomic non-breaking LTR tokens', () => {
  assert.deepEqual(tokenizeBidiText('پایگاه نظامی بیابانی (Desert Outpost)'), [
    { text: 'پایگاه نظامی بیابانی ', dir: 'auto' },
    { text: '(Desert Outpost)', dir: 'ltr', isParen: true },
  ]);

  assert.deepEqual(tokenizeBidiText('انبار صنعتی (Killhouse)'), [
    { text: 'انبار صنعتی ', dir: 'auto' },
    { text: '(Killhouse)', dir: 'ltr', isParen: true },
  ]);
});

test('tokenizeBidiText isolates 1v1 and (Duel Arena) separately in mixed RTL text', () => {
  assert.deepEqual(tokenizeBidiText('میدان دوئل ۱v۱ (Duel Arena)'), [
    { text: 'میدان دوئل ', dir: 'auto' },
    { text: '1v1', dir: 'ltr' },
    { text: ' ', dir: 'auto' },
    { text: '(Duel Arena)', dir: 'ltr', isParen: true },
  ]);

  assert.deepEqual(tokenizeBidiText('آنلاین (1v1 / 2v2)'), [
    { text: 'آنلاین ', dir: 'auto' },
    { text: '(1v1 / 2v2)', dir: 'ltr', isParen: true },
  ]);
});

test('tokenizeBidiText isolates inline Latin acronyms and numeric ratios uniformly', () => {
  assert.deepEqual(tokenizeBidiText('۳ سلاح (3/10)'), [
    { text: '3', dir: 'ltr' },
    { text: ' سلاح ', dir: 'auto' },
    { text: '(3/10)', dir: 'ltr', isParen: true },
  ]);

  assert.deepEqual(tokenizeBidiText('کلاسیک CQB'), [
    { text: 'کلاسیک ', dir: 'auto' },
    { text: 'CQB', dir: 'ltr' },
  ]);
});
