'use strict'
// Pixel size of a PNG or JPEG file (header only, no dependency).

function imageSize(buffer) {
  // PNG: 8-byte signature, then the IHDR chunk: width and height as 32-bit numbers.
  if (buffer.length > 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
  }
  // JPEG: walk the segments until a start-of-frame marker.
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) return null
      const marker = buffer[offset + 1]
      const length = buffer.readUInt16BE(offset + 2)
      const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)
      if (isFrame) return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) }
      offset += 2 + length
    }
  }
  return null
}

module.exports = { imageSize }
