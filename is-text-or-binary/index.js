// taken from https://github.com/bevry/istextorbinary
// but converted to simple cjs without the editions stuff which caused problem somehow
const pathUtil = require("path");
const textExtensions = require("./text-extensions");
const binaryExtensions = require("./binary-extensions");

function isText(filename, buffer) {
  // Test extensions
  if (filename) {
    // Extract filename
    const parts = pathUtil.basename(filename).split(".").reverse();

    // Cycle extensions
    for (const extension of parts) {
      if (textExtensions.indexOf(extension) !== -1) {
        return true;
      }
      if (binaryExtensions.indexOf(extension) !== -1) {
        return false;
      }
    }
  }

  // Fallback to encoding if extension check was not enough
  if (buffer) {
    return getEncoding(buffer) === "utf8";
  }

  // No buffer was provided
  return null;
}

function isBinary(filename, buffer) {
  const text = isText(filename, buffer);
  if (text == null) return null;
  return !text;
}

function getEncoding(buffer, opts) {
  // Check
  if (!buffer) return null;

  // Prepare
  const textEncoding = "utf8";
  const binaryEncoding = "binary";
  const chunkLength = opts?.chunkLength ?? 24;
  let chunkBegin = opts?.chunkBegin ?? 0;

  // Discover
  if (opts?.chunkBegin == null) {
    // Start
    let encoding = getEncoding(buffer, { chunkLength, chunkBegin });
    if (encoding === textEncoding) {
      // Middle
      chunkBegin = Math.max(0, Math.floor(buffer.length / 2) - chunkLength);
      encoding = getEncoding(buffer, {
        chunkLength,
        chunkBegin,
      });
      if (encoding === textEncoding) {
        // End
        chunkBegin = Math.max(0, buffer.length - chunkLength);
        encoding = getEncoding(buffer, {
          chunkLength,
          chunkBegin,
        });
      }
    }

    // Return
    return encoding;
  } else {
    // Extract
    const chunkEnd = Math.min(buffer.length, chunkBegin + chunkLength);
    const contentChunkUTF8 = buffer.toString(
      textEncoding,
      chunkBegin,
      chunkEnd
    );

    // Detect encoding
    for (let i = 0; i < contentChunkUTF8.length; ++i) {
      const charCode = contentChunkUTF8.charCodeAt(i);
      if (charCode === 65533 || charCode <= 8) {
        // 8 and below are control characters (e.g. backspace, null, eof, etc.)
        // 65533 is the unknown character
        // console.log(charCode, contentChunkUTF8[i])
        return binaryEncoding;
      }
    }

    // Return
    return textEncoding;
  }
}

module.exports = {
  getEncoding,
  isBinary,
  isText,
};
