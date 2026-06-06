const TARGET_CHAR_COUNT = 3000;
const TARGET_SECONDS = 120;

function padNumber(value, width) {
  return String(value).padStart(width, '0');
}

function createSegment(index) {
  return 'SEG' + padNumber(index, 4) + '-LONG-TEXT-TRANSFER-QA-NON-MEDICAL;';
}

function createTestText(targetLength) {
  const target = targetLength || TARGET_CHAR_COUNT;
  let output = '';
  let index = 1;

  while (output.length < target) {
    output += createSegment(index);
    index += 1;
  }

  return output.slice(0, target);
}

function estimateTargetSeconds(charCount) {
  if (!charCount) {
    return 0;
  }
  return Math.ceil((charCount / TARGET_CHAR_COUNT) * TARGET_SECONDS);
}

function compareText(sourceText, outputText) {
  const source = sourceText || '';
  const output = outputText || '';
  const exactMatch = source === output;
  let firstDiffIndex = -1;

  if (!exactMatch) {
    const maxLength = Math.max(source.length, output.length);
    for (let index = 0; index < maxLength; index += 1) {
      if (source.charAt(index) !== output.charAt(index)) {
        firstDiffIndex = index;
        break;
      }
    }
  }

  return {
    sourceLength: source.length,
    outputLength: output.length,
    exactMatch,
    firstDiffIndex,
    missingCount: Math.max(0, source.length - output.length),
    extraCount: Math.max(0, output.length - source.length)
  };
}

function evaluateResult(payload) {
  const elapsedMs = Number(payload.elapsedMs) || 0;
  const comparison = compareText(payload.sourceText, payload.outputText);
  const pass = elapsedMs > 0
    && elapsedMs <= TARGET_SECONDS * 1000
    && comparison.exactMatch;

  return {
    pass,
    status: pass ? 'passed' : 'failed',
    elapsedMs,
    elapsed: Math.round(elapsedMs / 1000),
    failureCategory: pass ? '' : (payload.failureCategory || 'unknown'),
    comparison
  };
}

function createPendingRecord() {
  const testText = createTestText(TARGET_CHAR_COUNT);
  return {
    id: 'long_text_' + Date.now(),
    target: TARGET_CHAR_COUNT + ' chars / ' + TARGET_SECONDS + ' seconds',
    charCount: testText.length,
    estimatedSeconds: estimateTargetSeconds(testText.length),
    status: 'pending',
    pass: false,
    date: new Date().toLocaleString(),
    elapsed: 0,
    elapsedMs: 0,
    failureCategory: '',
    createdAt: Date.now(),
    sourceTextLength: testText.length,
    source: 'qa_long_text'
  };
}

module.exports = {
  TARGET_CHAR_COUNT,
  TARGET_SECONDS,
  createTestText,
  estimateTargetSeconds,
  compareText,
  evaluateResult,
  createPendingRecord
};
