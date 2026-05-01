export function decodeAscBytes(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const encoding = detectEncoding(bytes);
  const decoded = new TextDecoder(encoding).decode(bytes);

  return normalizeAscText(decoded);
}

export function normalizeAscText(text) {
  return String(text || '')
    .replace(/^\uFEFF/, '')
    .replace(/\0/g, '');
}

function detectEncoding(bytes) {
  if (bytes.length >= 2) {
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
      return 'utf-16le';
    }

    if (bytes[0] === 0xfe && bytes[1] === 0xff) {
      return 'utf-16be';
    }
  }

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    return 'utf-8';
  }

  const sampleLength = Math.min(bytes.length, 512);
  let evenZeros = 0;
  let oddZeros = 0;

  for (let index = 0; index < sampleLength; index += 1) {
    if (bytes[index] !== 0) {
      continue;
    }

    if (index % 2 === 0) {
      evenZeros += 1;
    } else {
      oddZeros += 1;
    }
  }

  const halfSample = Math.max(1, sampleLength / 2);
  if (oddZeros / halfSample > 0.35 && evenZeros / halfSample < 0.05) {
    return 'utf-16le';
  }

  if (evenZeros / halfSample > 0.35 && oddZeros / halfSample < 0.05) {
    return 'utf-16be';
  }

  return 'utf-8';
}
