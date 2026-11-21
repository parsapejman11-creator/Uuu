/**
 * Zero-dependency ISO/IEC 18004 QR Code encoder (Byte mode, Error Correction Level L, Versions 1..6).
 * Supports invite URLs up to 134 UTF-8 bytes completely locally with zero external API calls
 * (works offline and behind any VPN).
 */

interface QrVersionSpec {
  version: number;
  size: number;
  totalCodewords: number;
  ecPerBlock: number;
  blocks: number;
  alignment: number[];
}

// ISO/IEC 18004 Table 9 — Error Correction Level L (Versions 1..6)
const QR_VERSIONS_L: readonly QrVersionSpec[] = [
  { version: 1, size: 21, totalCodewords: 26, ecPerBlock: 7, blocks: 1, alignment: [] },
  { version: 2, size: 25, totalCodewords: 44, ecPerBlock: 10, blocks: 1, alignment: [6, 18] },
  { version: 3, size: 29, totalCodewords: 70, ecPerBlock: 15, blocks: 1, alignment: [6, 22] },
  { version: 4, size: 33, totalCodewords: 100, ecPerBlock: 20, blocks: 1, alignment: [6, 26] },
  { version: 5, size: 37, totalCodewords: 134, ecPerBlock: 26, blocks: 1, alignment: [6, 30] },
  { version: 6, size: 41, totalCodewords: 172, ecPerBlock: 18, blocks: 2, alignment: [6, 34] },
];

// GF(256) arithmetic tables (primitive polynomial x^8 + x^4 + x^3 + x^2 + 1 = 0x11d)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function rsComputeEcc(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = rsGeneratorPoly(ecCount);
  const rem = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ rem[0];
    for (let j = 0; j < ecCount - 1; j++) {
      rem[j] = rem[j + 1];
    }
    rem[ecCount - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < ecCount; j++) {
        rem[j] ^= gfMul(gen[j + 1], factor);
      }
    }
  }
  return rem;
}

function encodeUtf8Bytes(input: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(input);
  }
  const out: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code < 0x80) out.push(code);
    else if (code < 0x800) {
      out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return new Uint8Array(out);
}

function selectVersion(byteLen: number): QrVersionSpec {
  for (const spec of QR_VERSIONS_L) {
    const dataCap = spec.totalCodewords - spec.ecPerBlock * spec.blocks;
    // Mode (4 bits) + char count (8 bits for V1..V9) + payload bytes
    if (byteLen + 2 <= dataCap) {
      return spec;
    }
  }
  return QR_VERSIONS_L[QR_VERSIONS_L.length - 1];
}

function buildCodewords(bytes: Uint8Array, spec: QrVersionSpec): Uint8Array {
  const dataCapacity = spec.totalCodewords - spec.ecPerBlock * spec.blocks;
  const maxBytes = Math.min(bytes.length, dataCapacity - 2);
  const bits: number[] = [];

  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  };

  // Byte mode indicator = 0100
  pushBits(0b0100, 4);
  // Character count (8 bits for Versions 1..9)
  pushBits(maxBytes, 8);
  for (let i = 0; i < maxBytes; i++) {
    pushBits(bytes[i], 8);
  }

  const maxBits = dataCapacity * 8;
  // Terminator (up to 4 zero bits)
  for (let i = 0; i < 4 && bits.length < maxBits; i++) bits.push(0);
  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);

  const data = new Uint8Array(dataCapacity);
  let byteIdx = 0;
  for (let i = 0; i < bits.length && byteIdx < dataCapacity; i += 8) {
    let b = 0;
    for (let k = 0; k < 8; k++) b = (b << 1) | (bits[i + k] || 0);
    data[byteIdx++] = b;
  }
  // Pad bytes 0xEC, 0x11 alternating
  let padToggle = true;
  while (byteIdx < dataCapacity) {
    data[byteIdx++] = padToggle ? 0xec : 0x11;
    padToggle = !padToggle;
  }

  // Split into RS blocks & compute ECC
  const blockDataLen = Math.floor(dataCapacity / spec.blocks);
  const dataBlocks: Uint8Array[] = [];
  const eccBlocks: Uint8Array[] = [];
  for (let b = 0; b < spec.blocks; b++) {
    const slice = data.subarray(b * blockDataLen, (b + 1) * blockDataLen);
    dataBlocks.push(slice);
    eccBlocks.push(rsComputeEcc(slice, spec.ecPerBlock));
  }

  // Interleave data codewords, then ECC codewords
  const result = new Uint8Array(spec.totalCodewords);
  let outIdx = 0;
  for (let i = 0; i < blockDataLen; i++) {
    for (let b = 0; b < spec.blocks; b++) {
      result[outIdx++] = dataBlocks[b][i];
    }
  }
  for (let i = 0; i < spec.ecPerBlock; i++) {
    for (let b = 0; b < spec.blocks; b++) {
      result[outIdx++] = eccBlocks[b][i];
    }
  }
  return result;
}

function computeFormatBits(maskPattern: number): number {
  // Error Correction Level L = 01
  const data = (0b01 << 3) | (maskPattern & 0b111);
  let rem = data << 10;
  const poly = 0b10100110111;
  for (let i = 14; i >= 10; i--) {
    if ((rem >> i) & 1) {
      rem ^= poly << (i - 10);
    }
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function maskBit(mask: number, r: number, c: number): boolean {
  switch (mask) {
    case 0:
      return (r + c) % 2 === 0;
    case 1:
      return r % 2 === 0;
    case 2:
      return c % 3 === 0;
    case 3:
      return (r + c) % 3 === 0;
    case 4:
      return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5:
      return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6:
      return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    default:
      return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
  }
}

function placeFormatBits(grid: boolean[][], size: number, mask: number): void {
  const fmt = computeFormatBits(mask);
  const bit = (i: number) => Boolean((fmt >> i) & 1);

  // Top-left horizontal & vertical
  for (let i = 0; i <= 5; i++) grid[8][i] = bit(14 - i);
  grid[8][7] = bit(8);
  grid[8][8] = bit(7);
  grid[7][8] = bit(6);
  for (let i = 9; i < 15; i++) grid[14 - i][8] = bit(14 - i);

  // Bottom-left & top-right copies
  for (let i = 0; i < 7; i++) grid[size - 1 - i][8] = bit(14 - i);
  for (let i = 7; i < 15; i++) grid[8][size - 15 + i] = bit(14 - i);
}

function evaluatePenalty(grid: boolean[][], size: number): number {
  let penalty = 0;
  // Rule 1: adjacent modules in row/col of same color
  for (let r = 0; r < size; r++) {
    let runLen = 1;
    for (let c = 1; c < size; c++) {
      if (grid[r][c] === grid[r][c - 1]) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }
  for (let c = 0; c < size; c++) {
    let runLen = 1;
    for (let r = 1; r < size; r++) {
      if (grid[r][c] === grid[r - 1][c]) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }
  // Rule 2: 2x2 blocks of same color
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = grid[r][c];
      if (grid[r][c + 1] === v && grid[r + 1][c] === v && grid[r + 1][c + 1] === v) {
        penalty += 3;
      }
    }
  }
  // Rule 4: dark/light balance
  let dark = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c]) dark++;
    }
  }
  const ratioPct = (dark * 100) / (size * size);
  penalty += Math.floor(Math.abs(ratioPct - 50) / 5) * 10;
  return penalty;
}

export interface QrMatrixResult {
  size: number;
  version: number;
  modules: boolean[][];
}

export function generateQrMatrix(text: string): QrMatrixResult {
  const bytes = encodeUtf8Bytes(text || '');
  const spec = selectVersion(bytes.length);
  const size = spec.size;
  const codewords = buildCodewords(bytes, spec);

  const isFunc: boolean[][] = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const baseGrid: boolean[][] = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

  const setFunc = (r: number, c: number, dark: boolean) => {
    if (r < 0 || c < 0 || r >= size || c >= size) return;
    isFunc[r][c] = true;
    baseGrid[r][c] = dark;
  };

  // Finder patterns + 1-module white separator
  const placeFinder = (topR: number, topC: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = topR + dr;
        const c = topC + dc;
        if (r < 0 || c < 0 || r >= size || c >= size) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const dark =
          inOuter &&
          (dr === 0 ||
            dr === 6 ||
            dc === 0 ||
            dc === 6 ||
            (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
        setFunc(r, c, dark);
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFunc(6, i, i % 2 === 0);
    setFunc(i, 6, i % 2 === 0);
  }

  // Alignment patterns (Version 2+)
  if (spec.alignment.length > 0) {
    for (const ar of spec.alignment) {
      for (const ac of spec.alignment) {
        if (isFunc[ar][ac]) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const dark =
              Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
            setFunc(ar + dr, ac + dc, dark);
          }
        }
      }
    }
  }

  // Dark module
  setFunc(size - 8, 8, true);

  // Reserve format info areas
  for (let i = 0; i <= 8; i++) {
    isFunc[8][i] = true;
    isFunc[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    isFunc[8][size - 1 - i] = true;
    isFunc[size - 1 - i][8] = true;
  }

  // Place data + ECC bits in standard upward/downward zigzag
  let bitIndex = 0;
  const totalBits = codewords.length * 8;
  let upward = true;
  for (let rightCol = size - 1; rightCol >= 1; rightCol -= 2) {
    if (rightCol === 6) rightCol = 5; // skip vertical timing column
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step;
      for (let offset = 0; offset < 2; offset++) {
        const c = rightCol - offset;
        if (isFunc[r][c]) continue;
        let dark = false;
        if (bitIndex < totalBits) {
          dark = Boolean((codewords[bitIndex >> 3] >> (7 - (bitIndex & 7))) & 1);
          bitIndex++;
        }
        baseGrid[r][c] = dark;
      }
    }
    upward = !upward;
  }

  // Pick optimal mask (0..7) with lowest penalty
  let bestGrid = baseGrid;
  let bestPenalty = Infinity;
  for (let m = 0; m < 8; m++) {
    const candidate = baseGrid.map((row, r) =>
      row.map((val, c) => (isFunc[r][c] ? val : val !== maskBit(m, r, c)))
    );
    placeFormatBits(candidate, size, m);
    const p = evaluatePenalty(candidate, size);
    if (p < bestPenalty) {
      bestPenalty = p;
      bestGrid = candidate;
    }
  }

  return {
    size,
    version: spec.version,
    modules: bestGrid,
  };
}

export function renderQrSvgPath(text: string, quietZone = 2): {
  size: number;
  viewBox: string;
  pathD: string;
} {
  const { size, modules } = generateQrMatrix(text);
  const fullSize = size + quietZone * 2;
  const parts: string[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) {
        parts.push(`M${c + quietZone},${r + quietZone}h1v1h-1z`);
      }
    }
  }
  return {
    size: fullSize,
    viewBox: `0 0 ${fullSize} ${fullSize}`,
    pathD: parts.join(''),
  };
}
