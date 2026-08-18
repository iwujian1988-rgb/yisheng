const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.REAL_EVAL_PORT || 18083);
process.env.STORE_MODE = 'memory';
process.env.PORT = String(PORT);
process.env.NODE_ENV = 'development';
process.env.AGENT_SERVICE_ENABLED = 'false';

const { server } = require('../src/server');
const { config } = require('../src/config');
const { buildStructuredDocument } = require('../src/ocr/structure-document');
const realLabGolden = require('../test-fixtures/ai-workspace/real-lab-golden');

// Keep authentication local for this deterministic end-to-end run; OCR and text AI
// still use the currently configured real providers below.
config.wechatAppId = '';
config.wechatAppSecret = '';
config.agentServiceEnabled = false;

const BASE_URL = 'http://127.0.0.1:' + PORT;
const reuseOcr = process.argv.includes('--reuse-ocr');
const inputPaths = process.argv.slice(2).filter((item) => item !== '--reuse-ocr').map((item) => path.resolve(item));
const diagnosticDir = path.resolve(process.cwd(), '.tmp', 'real-quality');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(route, options) {
  const response = await fetch(BASE_URL + route, Object.assign({
    headers: { 'Content-Type': 'application/json' }
  }, options || {}));
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.code !== 'OK') {
    throw new Error(route + ' failed: ' + (payload.message || payload.code || response.status));
  }
  return payload.data;
}

function dataUrl(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const mime = extension === '.png' ? 'image/png' : 'image/jpeg';
  return 'data:' + mime + ';base64,' + fs.readFileSync(filePath).toString('base64');
}

function fieldKeyByLabel(workspace, expectedLabel) {
  const field = (workspace.fields || []).find((item) => String(item.label || '').includes(expectedLabel));
  return field && field.key;
}

async function establishProfessionalSession() {
  const admin = await request('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ account: config.adminAccount, password: config.adminPassword })
  });
  const suffix = String(Date.now()).slice(-8);
  const activationCode = 'REAL-EVAL-' + suffix;
  const phone = '139' + String(Date.now()).slice(-8);
  const serialNo = 'REAL-EVAL-DEVICE-' + suffix;
  await request('/api/admin/activation-codes/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + admin.token },
    body: JSON.stringify({ codesText: activationCode, memberDays: 365 })
  });
  const user = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone: phone, code: '123456', wechatCode: 'real-quality-' + suffix })
  });
  await request('/api/purchase/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + user.token },
    body: JSON.stringify({ activationCode: activationCode })
  });
  await request('/api/admin/devices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + admin.token },
    body: JSON.stringify({ serialNo: serialNo, proofCode: '0000' })
  });
  await request('/api/devices/bind', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + user.token },
    body: JSON.stringify({ serialNo: serialNo, proofCode: '0000' })
  });
  const session = await request('/api/auth/me', {
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + user.token }
  });
  const challenge = await request('/api/devices/session/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + user.token },
    body: JSON.stringify({ deviceId: session.device.id })
  });
  const verified = await request('/api/devices/session/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + user.token },
    body: JSON.stringify({ challengeId: challenge.challengeId, deviceId: session.device.id, response: '0000' })
  });
  const heartbeat = await request('/api/devices/heartbeat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + user.token,
      'X-Device-Session': verified.deviceSessionToken
    }
  });
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + user.token,
      'X-Device-Session': verified.deviceSessionToken,
      'X-Device-Live': heartbeat.liveProof
    }
  };
}

async function main() {
  assert(config.aiApiKey, 'AI_API_KEY or DASHSCOPE_API_KEY is not configured');
  assert(config.dashscopeApiKey, 'DASHSCOPE_API_KEY is not configured');
  assert(inputPaths.length === 2, 'usage: node scripts/ai-workspace-real-quality-eval.js <lab-image-1> <lab-image-2>');
  inputPaths.forEach((filePath) => {
    assert(fs.existsSync(filePath), 'image not found: ' + filePath);
    assert(fs.statSync(filePath).size <= config.ocrMaxImageBytes, 'image exceeds production OCR limit: ' + path.basename(filePath));
  });

  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  const access = await establishProfessionalSession();
  const workspaceResult = await request('/api/ai/workspaces', {
    method: 'POST', headers: access.headers,
    body: JSON.stringify({ templateId: 'tpl_official_admission_note', detailLevel: 'standard' })
  });
  const workspace = workspaceResult.workspace;
  const nameKey = fieldKeyByLabel(workspace, '姓名');
  assert(nameKey, 'admission-note template has no patient name field');
  await request('/api/ai/workspaces/' + workspace.id + '/fields', {
    method: 'POST', headers: access.headers,
    body: JSON.stringify({ fieldKey: nameKey, value: '王大力' })
  });

  const allFactsBySource = [];
  const recognized = await Promise.all(inputPaths.map(async (inputPath, index) => {
    const startedAt = Date.now();
    const sourceId = 'real-lab-' + (index + 1);
    let result;
    const cachedTextPath = path.join(diagnosticDir, 'ocr-' + (index + 1) + '-latest.txt');
    if (reuseOcr) {
      assert(fs.existsSync(cachedTextPath), 'cached OCR text is missing for image ' + (index + 1));
      const cachedText = fs.readFileSync(cachedTextPath, 'utf8');
      result = {
        text: cachedText,
        charCount: cachedText.length,
        provider: 'cached-real-ocr',
        elapsedMs: 0,
        document: buildStructuredDocument({ text: cachedText, sourceId: sourceId, pageIndex: index })
      };
    } else {
      result = await request('/api/ocr/recognize', {
        method: 'POST', headers: access.headers,
        body: JSON.stringify({
          imageBase64: dataUrl(inputPath),
          fileType: path.extname(inputPath).slice(1),
          sourceId: sourceId,
          pageIndex: index,
          documentMode: 'table',
          professional: true,
          workspaceId: workspace.id
        })
      });
    }
    const facts = result.document && Array.isArray(result.document.facts) ? result.document.facts : [];
    fs.mkdirSync(diagnosticDir, { recursive: true });
    fs.writeFileSync(path.join(diagnosticDir, 'ocr-' + (index + 1) + '-latest.txt'), String(result.text || ''), 'utf8');
    assert(result.text, 'OCR returned empty text for image ' + (index + 1));
    assert(facts.length, 'OCR returned no structured lab facts for image ' + (index + 1));
    return { index, sourceId, startedAt, result, facts };
  }));
  const ocrResults = [];
  for (const item of recognized.sort((left, right) => left.index - right.index)) {
    const { index, sourceId, startedAt, result, facts } = item;
    await request('/api/ai/workspaces/' + workspace.id + '/materials', {
      method: 'POST', headers: access.headers,
      body: JSON.stringify({
        kind: 'ocr',
        text: result.text,
        clientMaterialId: sourceId,
        status: 'included',
        structuredFacts: facts,
        qualityState: 'ready',
        sourceMeta: {
          source: 'real-quality-eval', sourceId: sourceId, pageIndex: index,
          provider: result.provider, elapsedMs: result.elapsedMs,
          reportDate: result.document.reportDate || '',
          documentMetadata: result.document.metadata || {}
        }
      })
    });
    allFactsBySource[index] = facts;
    ocrResults.push({
      sourceId: sourceId,
      elapsedMs: Date.now() - startedAt,
      providerElapsedMs: result.elapsedMs,
      charCount: result.charCount,
      factCount: facts.length,
      reportDate: result.document.reportDate || '',
      sourceDate: result.document.sourceDate || {},
      factSamples: facts.slice(0, 3)
    });
  }

  const generation = await request('/api/ai/workspaces/' + workspace.id + '/generations', {
    method: 'POST', headers: access.headers,
    body: JSON.stringify({ idempotencyKey: 'real-eval-generation-' + Date.now() })
  });
  const generationStartedAt = Date.now();
  const result = await request('/api/agent/chat', {
    method: 'POST', headers: access.headers,
    body: JSON.stringify({ workspaceId: workspace.id, generationId: generation.generation.id })
  });
  const totalFacts = ocrResults.reduce((sum, item) => sum + item.factCount, 0);
  const quality = result.quality || {};
  const report = {
    provider: result.provider,
    model: result.model || config.aiResolvedModel,
    ocr: ocrResults,
    generationElapsedMs: Date.now() - generationStartedAt,
    totalFactCount: totalFacts,
    outputLength: String(result.bodyText || '').length,
    status: result.status,
    timings: result.timings || {},
    quality: quality,
    confirmItems: result.confirmItems || [],
    bodyText: result.bodyText || ''
  };
  fs.mkdirSync(diagnosticDir, { recursive: true });
  fs.writeFileSync(path.join(diagnosticDir, 'latest-result.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify({
    provider: report.provider,
    model: report.model,
    ocr: report.ocr,
    generationElapsedMs: report.generationElapsedMs,
    totalFactCount: report.totalFactCount,
    outputLength: report.outputLength,
    status: report.status,
    timings: report.timings,
    hardErrorCount: (quality.hardErrors || []).length,
    missingConfirmedFieldCount: (quality.missingConfirmedFields || []).length,
    sourceConflictCount: (quality.sourceConflicts || []).length,
    resultFile: path.join(diagnosticDir, 'latest-result.json')
  }, null, 2));
  assert(String(result.bodyText || '').includes('王大力'), 'confirmed patient name is missing');
  assert(result.status === 'ok', 'generation status is not ok: ' + result.status);
  assert(!(quality.hardErrors || []).length, 'hard quality errors remain');
  assert(!(quality.missingConfirmedFields || []).length, 'confirmed fields remain missing');
  assert(!(quality.sourceConflicts || []).length, 'unresolved source conflicts remain');
  assert(totalFacts >= 20, 'too few structured lab facts: ' + totalFacts);
  const firstFacts = allFactsBySource[0];
  const secondFacts = allFactsBySource[1];
  function factByCode(facts, code) {
    return facts.find((fact) => String(fact.code || '').replace(/\s+/g, '').toUpperCase() === code.replace(/\s+/g, '').toUpperCase());
  }
  function assertTuple(code, expected) {
    const fact = factByCode(firstFacts, code);
    assert(fact, 'missing golden fact: ' + code);
    Object.keys(expected).forEach((key) => assert(String(fact[key] || '') === String(expected[key] || ''), code + ' ' + key + ' mismatch: ' + fact[key]));
  }
  assertTuple('ALB/GLB', { result: '1.54', unit: '', referenceRange: '', flag: '' });
  assertTuple('TBA', { result: '17.5', unit: 'umol/L', referenceRange: '0--20', flag: '' });
  assertTuple('TBIL', { result: '15.90', unit: 'umol/L', referenceRange: '3.4--30', flag: '' });
  assertTuple('DBIL', { result: '4.10', unit: 'umol/L', referenceRange: '0--10', flag: '' });
  assertTuple('IBIL', { result: '11.80', unit: 'umol/L', referenceRange: '3--20', flag: '' });
  assertTuple('AST', { result: '28.0', unit: 'IU/L', referenceRange: '5--50', flag: '' });
  assertTuple('APOA', { result: '0.97', unit: 'g/L', referenceRange: '1--1.6', flag: 'low' });
  const ratioFact = firstFacts.find((fact) => /APOB\s*\/\s*APO[A-Z]?/i.test(String(fact.code || '') + ' ' + String(fact.name || '')));
  assert(ratioFact && ratioFact.result === '0.77' && !ratioFact.unit, 'APOB/APOA ratio tuple mismatch');
  assert(ocrResults[1].sourceDate.type === 'application' && ocrResults[1].sourceDate.value === '2024-04-03', 'application date semantics were not preserved');
  assert(!ocrResults[1].reportDate, 'application date was incorrectly promoted to report date');
  allFactsBySource.forEach((facts, sourceIndex) => {
    const expectedSource = realLabGolden[sourceIndex];
    assert(expectedSource && facts.length === expectedSource.rows.length, 'golden row count mismatch for source ' + (sourceIndex + 1));
    assert(JSON.stringify(ocrResults[sourceIndex].sourceDate) === JSON.stringify(expectedSource.sourceDate), 'golden source date mismatch for source ' + (sourceIndex + 1));
    facts.forEach((fact, rowIndex) => {
      const expected = expectedSource.rows[rowIndex];
      const actual = [fact.code, fact.name, fact.result, fact.unit, fact.referenceRange, fact.flag];
      actual.forEach((value, columnIndex) => {
        const normalizeCell = (item) => String(item || '').replace(/\s+/g, '').toLowerCase();
        assert(normalizeCell(value) === normalizeCell(expected[columnIndex]), 'golden tuple mismatch source ' + (sourceIndex + 1) + ' row ' + (rowIndex + 1) + ' column ' + columnIndex + ': ' + value);
      });
    });
  });
  assert((quality.usedFactIds || []).length === totalFacts, 'not every structured lab fact was used');
  assert(!String(result.bodyText || '').includes('[[STRUCTURED_FACTS'), 'structured facts marker leaked into output');
  assert((String(result.bodyText || '').match(/检验结果/g) || []).length === 1, 'structured lab section is duplicated');
  assert(String(result.bodyText || '').includes('18.32 mmol/L') && String(result.bodyText || '').includes('1292 IU/L'), 'known abnormal lab values are missing');
  assert(String(result.bodyText || '').includes('35岁') && String(result.bodyText || '').includes('男'), 'structured report header demographics are missing');
  assert(String(result.bodyText || '').includes('肝脓肿'), 'explicit preliminary diagnosis is missing');
  assert(!(quality.warnings || []).length, 'quality warnings remain');
  assert(!(result.confirmItems || []).some((item) => /是否需纳入|同一患者|是否属于同一|是否作为本次|是否写入/.test(String(item))), 'redundant source inclusion, identity, or explicit-fact question remains');
  console.log('AI_WORKSPACE_REAL_QUALITY_EVAL_OK');
}

main().catch((error) => {
  console.error('AI_WORKSPACE_REAL_QUALITY_EVAL_FAILED');
  console.error(error.stack || error.message);
  process.exitCode = 1;
}).finally(() => {
  if (server.listening) server.close();
});
