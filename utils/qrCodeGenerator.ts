/**
 * Self-contained, pure TypeScript QR Code Generator
 * Generates ISO/IEC 18004 QR Codes without external network dependencies.
 */

// Error correction level
export type QRErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

// Reed-Solomon GF(256) math tables
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

(function initGaloisField() {
  let val = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = val;
    EXP_TABLE[i + 255] = val;
    LOG_TABLE[val] = i;
    val = (val << 1) ^ (val >= 128 ? 0x11d : 0);
  }
})();

function gfMultiply(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
}

function getGeneratorPolynomial(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const nextPoly = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      nextPoly[j] ^= gfMultiply(poly[j], EXP_TABLE[i]);
      nextPoly[j + 1] ^= poly[j];
    }
    poly = nextPoly;
  }
  return poly;
}

function calculateECC(data: Uint8Array, eccCount: number): Uint8Array {
  const gen = getGeneratorPolynomial(eccCount);
  const result = new Uint8Array(eccCount);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ result[0];
    result.copyWithin(0, 1);
    result[eccCount - 1] = 0;
    for (let j = 0; j < eccCount; j++) {
      result[j] ^= gfMultiply(gen[j], factor);
    }
  }
  return result;
}

// QR Code Specifications for Versions 1-10 with 'M' error correction
interface VersionSpec {
  version: number;
  totalCodewords: number;
  dataCodewords: number;
  eccCodewordsPerBlock: number;
  numBlocks: number;
  alignmentPatterns: number[];
}

const VERSION_SPECS: Record<number, VersionSpec> = {
  1: { version: 1, totalCodewords: 26, dataCodewords: 16, eccCodewordsPerBlock: 10, numBlocks: 1, alignmentPatterns: [] },
  2: { version: 2, totalCodewords: 44, dataCodewords: 28, eccCodewordsPerBlock: 16, numBlocks: 1, alignmentPatterns: [6, 18] },
  3: { version: 3, totalCodewords: 70, dataCodewords: 44, eccCodewordsPerBlock: 26, numBlocks: 1, alignmentPatterns: [6, 22] },
  4: { version: 4, totalCodewords: 100, dataCodewords: 64, eccCodewordsPerBlock: 18, numBlocks: 2, alignmentPatterns: [6, 26] },
  5: { version: 5, totalCodewords: 134, dataCodewords: 86, eccCodewordsPerBlock: 24, numBlocks: 2, alignmentPatterns: [6, 30] },
  6: { version: 6, totalCodewords: 172, dataCodewords: 108, eccCodewordsPerBlock: 16, numBlocks: 4, alignmentPatterns: [6, 34] },
  7: { version: 7, totalCodewords: 196, dataCodewords: 124, eccCodewordsPerBlock: 18, numBlocks: 4, alignmentPatterns: [6, 22, 38] },
  8: { version: 8, totalCodewords: 242, dataCodewords: 154, eccCodewordsPerBlock: 22, numBlocks: 4, alignmentPatterns: [6, 24, 42] },
};

function selectVersion(dataLen: number): VersionSpec {
  for (let v = 1; v <= 8; v++) {
    const spec = VERSION_SPECS[v];
    // 4 bits mode + 8 bits count + data
    if (spec.dataCodewords >= dataLen + 3) {
      return spec;
    }
  }
  return VERSION_SPECS[8];
}

class BitBuffer {
  private bits: number[] = [];
  put(val: number, length: number) {
    for (let i = length - 1; i >= 0; i--) {
      this.bits.push((val >>> i) & 1);
    }
  }
  getBits(): number[] {
    return this.bits;
  }
  toCodewords(targetLength: number): Uint8Array {
    const result = new Uint8Array(targetLength);
    for (let i = 0; i < this.bits.length; i++) {
      result[i >>> 3] |= this.bits[i] << (7 - (i & 7));
    }
    // Pad remainder with alternating pattern 0xEC, 0x11
    let padIndex = Math.ceil(this.bits.length / 8);
    let padByte = 0xec;
    while (padIndex < targetLength) {
      result[padIndex++] = padByte;
      padByte = padByte === 0xec ? 0x11 : 0xec;
    }
    return result;
  }
}

export function generateQRMatrix(text: string): boolean[][] {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text);
  const spec = selectVersion(textBytes.length);
  const size = 17 + spec.version * 4;

  const buffer = new BitBuffer();
  // Byte mode indicator (0100)
  buffer.put(0x4, 4);
  // Character count indicator
  buffer.put(textBytes.length, spec.version <= 9 ? 8 : 16);
  // Text bytes
  for (let i = 0; i < textBytes.length; i++) {
    buffer.put(textBytes[i], 8);
  }
  // Terminator
  buffer.put(0, Math.min(4, spec.dataCodewords * 8 - buffer.getBits().length));

  const dataCodewords = buffer.toCodewords(spec.dataCodewords);

  // Split into blocks and compute ECC
  const blockSize = Math.floor(spec.dataCodewords / spec.numBlocks);
  const blocks: Uint8Array[] = [];
  const eccBlocks: Uint8Array[] = [];

  for (let b = 0; b < spec.numBlocks; b++) {
    const start = b * blockSize;
    const end = b === spec.numBlocks - 1 ? spec.dataCodewords : start + blockSize;
    const blockData = dataCodewords.slice(start, end);
    blocks.push(blockData);
    eccBlocks.push(calculateECC(blockData, spec.eccCodewordsPerBlock));
  }

  // Interleave data and ECC codewords
  const interleaved: number[] = [];
  const maxBlockLen = Math.max(...blocks.map(b => b.length));
  for (let i = 0; i < maxBlockLen; i++) {
    for (let b = 0; b < spec.numBlocks; b++) {
      if (i < blocks[b].length) interleaved.push(blocks[b][i]);
    }
  }
  for (let i = 0; i < spec.eccCodewordsPerBlock; i++) {
    for (let b = 0; b < spec.numBlocks; b++) {
      interleaved.push(eccBlocks[b][i]);
    }
  }

  // Build 2D matrix
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Function: Finder patterns (top-left, top-right, bottom-left)
  function placeFinder(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        isFunction[nr][nc] = true;
        const inOuter = r >= 0 && r <= 6 && (c === 0 || c === 6 || r === 0 || r === 6);
        const inInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[nr][nc] = inOuter || inInner;
      }
    }
  }

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    isFunction[6][i] = true;
    matrix[6][i] = i % 2 === 0;
    isFunction[i][6] = true;
    matrix[i][6] = i % 2 === 0;
  }

  // Dark module
  isFunction[size - 8][8] = true;
  matrix[size - 8][8] = true;

  // Alignment patterns
  if (spec.alignmentPatterns.length > 0) {
    const coords = spec.alignmentPatterns;
    for (const r of coords) {
      for (const c of coords) {
        if (
          (r === coords[0] && c === coords[0]) ||
          (r === coords[0] && c === coords[coords.length - 1]) ||
          (r === coords[coords.length - 1] && c === coords[0])
        ) {
          continue; // Skip finder overlap
        }
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            isFunction[r + dr][c + dc] = true;
            matrix[r + dr][c + dc] = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          }
        }
      }
    }
  }

  // Format info area reservation
  for (let i = 0; i < 9; i++) {
    if (i < size) {
      isFunction[8][i] = true;
      isFunction[i][8] = true;
      isFunction[8][size - 1 - i] = true;
      isFunction[size - 1 - i][8] = true;
    }
  }

  // Place data bits with zig-zag scan
  let bitIdx = 0;
  const interleavedBits: number[] = [];
  for (const byte of interleaved) {
    for (let b = 7; b >= 0; b--) {
      interleavedBits.push((byte >>> b) & 1);
    }
  }

  let right = size - 1;
  let upward = true;

  while (right > 0) {
    if (right === 6) right--; // Skip vertical timing column
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const row of rows) {
      for (const col of [right, right - 1]) {
        if (!isFunction[row][col]) {
          const bit = bitIdx < interleavedBits.length ? interleavedBits[bitIdx++] : 0;
          // Mask pattern 0: (row + col) % 2 === 0
          const mask = (row + col) % 2 === 0;
          matrix[row][col] = (bit === 1) ^ mask;
        }
      }
    }
    right -= 2;
    upward = !upward;
  }

  // Format info for ECC 'M' (00) & Mask 0 (000) => 0b00000 -> Format codeword 0x5412
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  for (let i = 0; i < 15; i++) {
    const bit = formatBits[i] === 1;
    // Top-left
    if (i <= 5) matrix[8][i] = bit;
    else if (i === 6) matrix[8][7] = bit;
    else if (i === 7) matrix[8][8] = bit;
    else if (i === 8) matrix[7][8] = bit;
    else matrix[14 - i][8] = bit;

    // Split for top-right & bottom-left
    if (i < 8) matrix[size - 1 - i][8] = bit;
    else matrix[8][size - 15 + i] = bit;
  }

  return matrix;
}

/**
 * Generate SVG Path or standalone SVG string for the QR Code
 */
export function generateQRSVG(text: string, sizePx = 240, margin = 4): string {
  const matrix = generateQRMatrix(text);
  const matrixSize = matrix.length;
  const totalSize = matrixSize + margin * 2;
  const moduleSize = sizePx / totalSize;

  let path = '';
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        const x = (c + margin) * moduleSize;
        const y = (r + margin) * moduleSize;
        path += `M${x.toFixed(2)},${y.toFixed(2)}h${moduleSize.toFixed(2)}v${moduleSize.toFixed(2)}h-${moduleSize.toFixed(2)}z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sizePx} ${sizePx}" width="${sizePx}" height="${sizePx}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#ffffff"/><path d="${path}" fill="#0f172a"/></svg>`;
}

/**
 * Generate Data URL string (image/svg+xml) for easy embedding in <img> or PDF
 */
export function generateQRDataUrl(text: string, sizePx = 300): string {
  const svg = generateQRSVG(text, sizePx);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
