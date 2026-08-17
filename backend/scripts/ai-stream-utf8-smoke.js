const utf8Stream = require('../../utils/utf8-stream');

function splitEveryByte(text) {
  const bytes = Buffer.from(text, 'utf8');
  return decodeWithChunks(bytes, Array(bytes.length).fill(1));
}

function decodeWithChunks(bytes, chunks) {
  const decoder = utf8Stream.createUtf8StreamDecoder();
  let output = '';
  let position = 0;
  chunks.forEach((size) => {
    const end = Math.min(bytes.length, position + size);
    const chunk = bytes.subarray(position, end);
    output += decoder.decode(chunk);
    position = end;
  });
  if (position < bytes.length) {
    output += decoder.decode(bytes.subarray(position));
  }
  return output + decoder.flush();
}

const observedResult = '一般资料\n患者姓名：王大力\n检查结果：血常规正常。';
const event = 'event: done\ndata: ' + JSON.stringify({ finalResult: { bodyText: observedResult } }) + '\n\n';
const decoded = splitEveryByte(event);

if (decoded !== event) {
  throw new Error('UTF-8 stream decoder corrupted Chinese split across byte boundaries');
}
if (decoded.includes('ä¸è¬èµæ')) {
  throw new Error('observed Latin-1 mojibake returned');
}
if (splitEveryByte('中文🙂é≥·×') !== '中文🙂é≥·×') {
  throw new Error('UTF-8 stream decoder corrupted supplementary or non-ASCII characters');
}

['一般资料', '中文🙂é≥·×，。！？', 'ASCII only', '𠮷野家与emoji🚑'].forEach((sample) => {
  const bytes = Buffer.from(sample, 'utf8');
  for (let split = 0; split <= bytes.length; split += 1) {
    if (decodeWithChunks(bytes, [split, bytes.length - split]) !== sample) {
      throw new Error('UTF-8 stream decoder failed at split ' + split);
    }
  }
});

const standardDecoder = new TextDecoder('utf-8');
[
  [0x80], [0xC0, 0xAF], [0xE0, 0x80, 0x80],
  [0xED, 0xA0, 0x80], [0xF4, 0x90, 0x80, 0x80], [0xF0, 0x9F]
].forEach((values) => {
  const bytes = Uint8Array.from(values);
  if (utf8Stream.decodeUtf8(bytes) !== standardDecoder.decode(bytes)) {
    throw new Error('Malformed UTF-8 handling differs from the standard decoder: ' + values.join(','));
  }
});

console.log('AI_STREAM_UTF8_SMOKE_OK');
