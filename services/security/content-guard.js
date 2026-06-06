const { redactSensitiveText, createSafeTextSummary } = require('./redaction');

function prepareTextForThirdPartyAi(text) {
  const redaction = redactSensitiveText(text);
  return {
    safeText: redaction.text,
    redactionHits: redaction.hits,
    changed: redaction.changed,
    summary: createSafeTextSummary(redaction.text)
  };
}

function assertNoPlainTextForLog(text) {
  const summary = createSafeTextSummary(text);
  return {
    blocked: true,
    reason: 'Plain user text must not be written to logs.',
    summary
  };
}

module.exports = {
  prepareTextForThirdPartyAi,
  assertNoPlainTextForLog
};
