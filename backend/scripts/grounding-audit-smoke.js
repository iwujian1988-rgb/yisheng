const assert = require('assert');

process.env.AI_API_KEY = 'grounding-smoke-key';
process.env.AI_BASE_URL = 'https://api.deepseek.com';
process.env.AI_CHAT_COMPLETIONS_URL = 'https://api.deepseek.com/chat/completions';
process.env.AI_MODEL = 'deepseek-chat';
process.env.AI_THINKING_MODE = 'disabled';

let responsePayload = {
  unsupportedFragments: [{
    text: '\u8003\u8651\u7ec6\u83cc\u6027\u80ba\u708e',
    category: 'diagnosis',
    reason: '\u6e90\u6750\u6599\u6ca1\u6709\u8be5\u8bca\u65ad'
  }]
};

global.fetch = async function (_url, options) {
  const body = JSON.parse(options.body);
  assert.deepStrictEqual(body.thinking, { type: 'disabled' });
  return {
    ok: true,
    json: async function () {
      return { choices: [{ message: { content: JSON.stringify(responsePayload) } }] };
    }
  };
};

const { auditSourceGrounding, filterResolvedGroundingErrors, removeUnsupportedJudgmentSections } = require('../src/modules/direct-ai-chat');

assert.deepStrictEqual(filterResolvedGroundingErrors([
  { code: 'UNSUPPORTED_CLINICAL_CLAIM', category: 'diagnosis', fragment: '\u521d\u6b65\u8bca\u65ad\uff1a\u809d\u8113\u80bf\u3002' }
], '\u8bca\u65ad\u7ed3\u8bba\n\u521d\u6b65\u8bca\u65ad\uff1a\u809d\u8113\u80bf\u3002', [
  { key: 'preliminaryDiagnosis', value: '\u809d\u8113\u80bf', certainty: 'preliminary' }
]), [], 'an exact preliminary diagnosis must not be rejected by a variable AI audit');

async function main() {
  const stripped = removeUnsupportedJudgmentSections(
    '病例特点\n发热3天\n\n初步诊断\n考虑肺部感染\n\n诊断依据\n根据发热和湿啰音\n\n鉴别诊断\n与支气管炎鉴别\n\n诊疗计划\n完善血常规',
    '发热3天，计划完善血常规',
    { generationContract: { sections: ['病例特点', '初步诊断', '诊断依据', '鉴别诊断', '诊疗计划'] } }
  );
  assert(!stripped.includes('考虑肺部感染'));
  assert(!stripped.includes('根据发热和湿啰音'));
  assert(!stripped.includes('与支气管炎鉴别'));
  assert(stripped.includes('发热3天') && stripped.includes('完善血常规'));

  const data = { mode: 'professional', template: { generationContract: {} }, confirmedFields: [] };
  const unsupported = await auditSourceGrounding('\u53d1\u70ed3\u5929', '\u8003\u8651\u7ec6\u83cc\u6027\u80ba\u708e', data);
  assert.strictEqual(unsupported.hardErrors.length, 1);
  assert.strictEqual(unsupported.hardErrors[0].code, 'UNSUPPORTED_CLINICAL_CLAIM');

  responsePayload = { unsupportedFragments: [] };
  const grounded = await auditSourceGrounding('\u53d1\u70ed3\u5929', '\u53d1\u70ed3\u5929', data);
  assert.deepStrictEqual(grounded.hardErrors, []);
  console.log('GROUNDING_AUDIT_SMOKE_OK');
}

main().catch(function (error) {
  console.error(error.stack || error.message);
  process.exit(1);
});
