function toBytes(input) {
  if (!input) return new Uint8Array(0);
  if (input instanceof Uint8Array) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (input.buffer instanceof ArrayBuffer) {
    return new Uint8Array(input.buffer, input.byteOffset || 0, input.byteLength || input.length || 0);
  }
  return new Uint8Array(0);
}

function joinBytes(left, right) {
  if (!left.length) return right;
  if (!right.length) return left;
  var joined = new Uint8Array(left.length + right.length);
  joined.set(left, 0);
  joined.set(right, left.length);
  return joined;
}

function appendCodePoint(output, codePoint) {
  if (codePoint <= 0xFFFF) return output + String.fromCharCode(codePoint);
  var value = codePoint - 0x10000;
  return output + String.fromCharCode(0xD800 + (value >> 10), 0xDC00 + (value & 0x3FF));
}

function isContinuation(value) {
  return (value & 0xC0) === 0x80;
}

function createUtf8StreamDecoder() {
  var pending = new Uint8Array(0);

  function decode(input, final) {
    if (typeof input === 'string') {
      var prefix = pending.length ? decode(new Uint8Array(0), true) : '';
      return prefix + input;
    }

    var bytes = joinBytes(pending, toBytes(input));
    pending = new Uint8Array(0);
    var output = '';
    var index = 0;

    while (index < bytes.length) {
      var first = bytes[index];
      if (first <= 0x7F) {
        output += String.fromCharCode(first);
        index += 1;
        continue;
      }

      var length = 0;
      var codePoint = 0;
      if (first >= 0xC2 && first <= 0xDF) {
        length = 2;
        codePoint = first & 0x1F;
      } else if (first >= 0xE0 && first <= 0xEF) {
        length = 3;
        codePoint = first & 0x0F;
      } else if (first >= 0xF0 && first <= 0xF4) {
        length = 4;
        codePoint = first & 0x07;
      } else {
        output += '\uFFFD';
        index += 1;
        continue;
      }

      if (index + length > bytes.length) {
        if (!final) {
          pending = bytes.slice(index);
          break;
        }
        output += '\uFFFD';
        index = bytes.length;
        break;
      }

      var second = bytes[index + 1];
      var valid = isContinuation(second)
        && !(first === 0xE0 && second < 0xA0)
        && !(first === 0xED && second >= 0xA0)
        && !(first === 0xF0 && second < 0x90)
        && !(first === 0xF4 && second >= 0x90);
      for (var offset = 2; valid && offset < length; offset += 1) {
        valid = isContinuation(bytes[index + offset]);
      }
      if (!valid) {
        output += '\uFFFD';
        index += 1;
        continue;
      }

      for (var part = 1; part < length; part += 1) {
        codePoint = (codePoint << 6) | (bytes[index + part] & 0x3F);
      }
      output = appendCodePoint(output, codePoint);
      index += length;
    }
    return output;
  }

  return {
    decode: function (input) { return decode(input, false); },
    flush: function () { return decode(new Uint8Array(0), true); }
  };
}

function decodeUtf8(input) {
  var decoder = createUtf8StreamDecoder();
  return decoder.decode(input) + decoder.flush();
}

module.exports = {
  createUtf8StreamDecoder: createUtf8StreamDecoder,
  decodeUtf8: decodeUtf8
};
