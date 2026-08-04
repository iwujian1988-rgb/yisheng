const assert = require('assert');
const { config } = require('../src/config');
const directAi = require('../src/modules/direct-ai-chat');

async function run() {
  config.aiApiKey = 'test-key';
  config.aiChatCompletionsUrl = 'https://provider.test/chat/completions';
  config.aiBaseUrl = '';
  config.aiResolvedModel = 'test-model';
  config.wechatAppId = '';
  config.wechatAppSecret = '';

  var capturedBody = null;
  global.fetch = async function (url, options) {
    assert.strictEqual(url, config.aiChatCompletionsUrl);
    assert.strictEqual(options.headers.Authorization, 'Bearer test-key');
    capturedBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async function () {
        return {
          choices: [{ message: { content: 'Fallback reply' } }],
          usage: { total_tokens: 12 }
        };
      }
    };
  };

  var result = await directAi.callDirectAi('chat', {
    message: 'Organize this note',
    mode: 'general',
    attachments: [{ type: 'image', ocrText: 'OCR content' }],
    messages: [{ role: 'assistant', content: 'Previous reply' }]
  });

  assert.strictEqual(result.bodyText, 'Fallback reply');
  assert.strictEqual(result.status, 'ok');
  assert.strictEqual(capturedBody.model, 'test-model');
  assert(capturedBody.messages.some(function (item) {
    return item.role === 'user' && item.content.indexOf('OCR content') !== -1;
  }));
  console.log('AGENT_FALLBACK_SMOKE_OK');
}

run().catch(function (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
