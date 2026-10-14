/**
 * Nano Banana AI Digital Fingerprint & Cryptographic Steganography Engine
 * Embeds and extracts invisible watermarks and tamper-proof verification payloads
 * directly into transfer receipt images using lossless LSB encoding.
 */

export interface FingerprintPayload {
  version: string;
  txId: string;
  reference: string;
  amount: number;
  senderId?: string;
  senderName?: string;
  receiverId: string;
  receiverName: string;
  timestamp: string;
  securityHash: string;
  signature: string;
  blockNumber: number;
  engine: string;
}

const MAGIC_PREFIX = '###NB_AI_FP_START###';
const MAGIC_SUFFIX = '###NB_AI_FP_END###';

/**
 * Embeds an invisible cryptographic watermark payload into the canvas pixels.
 * Uses LSB (Least Significant Bit) manipulation on the bottom 4 rows of pixels.
 */
export function embedDigitalFingerprint(
  canvas: HTMLCanvasElement,
  payload: FingerprintPayload
): boolean {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    const jsonString = MAGIC_PREFIX + JSON.stringify(payload) + MAGIC_SUFFIX;
    // Convert string to binary bit array
    const bits: number[] = [];
    for (let i = 0; i < jsonString.length; i++) {
      const code = jsonString.charCodeAt(i);
      for (let b = 7; b >= 0; b--) {
        bits.push((code >> b) & 1);
      }
    }

    const width = canvas.width;
    const height = canvas.height;
    // We place bits starting from bottom rows (e.g. from height - 4 to height - 1)
    const startY = Math.max(0, height - 6);
    const rowHeight = height - startY;
    const imgData = ctx.getImageData(0, startY, width, rowHeight);
    const data = imgData.data;

    // Check capacity: each pixel has 4 channels (R, G, B, A). We use R channel LSB.
    const maxBits = (width * rowHeight);
    if (bits.length > maxBits) {
      console.warn('Payload exceeds LSB capacity, truncating or increasing rows');
      return false;
    }

    for (let i = 0; i < bits.length; i++) {
      const pixelIdx = i * 4; // R channel of pixel i
      const currentVal = data[pixelIdx];
      // Set the lowest bit to match our bit
      data[pixelIdx] = (currentVal & 0xfe) | bits[i];
    }

    ctx.putImageData(imgData, 0, startY);
    return true;
  } catch (err) {
    console.error('Failed to embed digital fingerprint:', err);
    return false;
  }
}

/**
 * Extracts and decodes the invisible digital fingerprint from an image canvas.
 */
export function extractDigitalFingerprint(canvas: HTMLCanvasElement): FingerprintPayload | null {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const width = canvas.width;
    const height = canvas.height;
    const startY = Math.max(0, height - 6);
    const rowHeight = height - startY;
    const imgData = ctx.getImageData(0, startY, width, rowHeight);
    const data = imgData.data;

    const totalPixels = width * rowHeight;
    let chars: string[] = [];
    let currentByte = 0;
    let bitCount = 0;

    for (let i = 0; i < totalPixels; i++) {
      const pixelIdx = i * 4;
      const bit = data[pixelIdx] & 1;
      currentByte = (currentByte << 1) | bit;
      bitCount++;

      if (bitCount === 8) {
        chars.push(String.fromCharCode(currentByte));
        currentByte = 0;
        bitCount = 0;

        // Optimization: check if we hit the end marker
        const fullSoFar = chars.slice(-30).join('');
        if (fullSoFar.includes(MAGIC_SUFFIX)) {
          break;
        }
      }
    }

    const reconstructed = chars.join('');
    const startIdx = reconstructed.indexOf(MAGIC_PREFIX);
    const endIdx = reconstructed.indexOf(MAGIC_SUFFIX);

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const jsonStr = reconstructed.substring(startIdx + MAGIC_PREFIX.length, endIdx);
      const parsed = JSON.parse(jsonStr) as FingerprintPayload;
      return parsed;
    }

    return null;
  } catch (err) {
    console.error('Failed to extract digital fingerprint:', err);
    return null;
  }
}
