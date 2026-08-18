const assert = require('assert');
const fixture = require('../test-fixtures/ai-workspace/large-record-two-labs.json');
const { assessStructuredFacts, assessTextQuality } = require('../src/modules/text-quality');
const { generationResultState } = require('../src/modules/agent-api');
const { createAiWorkspaceRepository } = require('../src/repositories/ai-workspace-repository');
const { buildStructuredDocument } = require('../src/ocr/structure-document');
const { materializeRequiredSourceFacts, renderStructuredFacts } = require('../src/modules/structured-facts-renderer');
const { removeMisplacedReportFacts } = require('../src/modules/direct-ai-chat');

function allFacts() {
  return fixture.materials.reduce(function (all, material) {
    return all.concat(material.structuredFacts || []);
  }, []);
}

async function main() {
  var parsed = buildStructuredDocument({
    sourceId: 'table_source',
    text: '报告日期：2024-04-03\n<table><tr><td>序号</td><td>编码</td><td>名称</td><td>结果</td><td>参考区间</td><td>单位</td></tr><tr><td>1</td><td>GLU</td><td>葡萄糖</td><td>18.32 ↑</td><td>3.89-6.11</td><td>mmol/L</td></tr></table>'
  });
  assert.strictEqual(parsed.documentType, 'lab_report');
  assert.strictEqual(parsed.reportDate, '2024-04-03');
  assert.deepStrictEqual(parsed.facts[0] && [parsed.facts[0].code, parsed.facts[0].name, parsed.facts[0].result, parsed.facts[0].unit, parsed.facts[0].referenceRange, parsed.facts[0].flag], ['GLU', '葡萄糖', '18.32', 'mmol/L', '3.89-6.11', 'high']);

  var header = buildStructuredDocument({
    sourceId: 'header_source',
    text: '\u59d3\u540d\uff1a \u767b\u8bb0\u53f7\uff1a0000776092 \u60a3\u8005\u7c7b\u578b\uff1a\u4f4f\u9662 \u6027\u522b\uff1a\u7537 \u5e74\u9f84\uff1a35\u5c81 \u79d1\u522b\uff1a\u666e\u5916\u79d1 \u4f4f\u9662\u53f7\uff1a354065 \u6807\u672c\u7c7b\u578b\uff1a\u8840\u6e05 \u521d\u6b65\u8bca\u65ad\uff1a\u809d\u8113\u80bf'
  });
  assert.strictEqual(header.metadata.patientName, '', 'a blank name must not consume the registration number');
  assert.deepStrictEqual(
    [header.metadata.sex, header.metadata.age, header.metadata.patientType, header.metadata.registrationNo, header.metadata.inpatientNo, header.metadata.department, header.metadata.specimenType, header.metadata.preliminaryDiagnosis],
    ['\u7537', '35\u5c81', '\u4f4f\u9662', '0000776092', '354065', '\u666e\u5916\u79d1', '\u8840\u6e05', '\u809d\u8113\u80bf']
  );

  var facts = allFacts();
  var validBody = '一般资料\n姓名：王大力\n\n实验室检查\n' + renderStructuredFacts(facts);
  var valid = assessTextQuality('', validBody, {}, fixture.confirmedFields, { structuredFacts: facts });
  assert.deepStrictEqual(valid.missingConfirmedFields, []);
  assert.deepStrictEqual(valid.hardErrors, []);
  assert.strictEqual(valid.usedFactIds.length, facts.length);

  var wrongDateBody = validBody.replace(/(来源1（)[^）]+/, '$1报告日期：2024-04-03');
  var wrongDate = assessStructuredFacts(wrongDateBody, facts);
  assert.ok(wrongDate.hardErrors.some(function (item) { return item.factId === 'fact_a_tp'; }), 'source A must not borrow source B date');

  var wrongRangeBody = validBody.replace('22-195', '15-40');
  var wrongRange = assessStructuredFacts(wrongRangeBody, facts);
  assert.ok(wrongRange.hardErrors.some(function (item) { return item.factId === 'fact_a_ck' && item.code === 'LAB_TUPLE_BROKEN'; }));

  var missingName = assessTextQuality('', validBody.replace('王大力', '【姓名】'), {}, fixture.confirmedFields, { structuredFacts: facts });
  assert.deepStrictEqual(missingName.missingConfirmedFields, ['姓名']);
  assert.strictEqual(generationResultState({ bodyText: validBody, quality: missingName }).status, 'needs_review');
  assert.strictEqual(generationResultState({ bodyText: validBody, quality: valid }).status, 'completed');

  var requiredHeader = assessTextQuality('', validBody, {}, fixture.confirmedFields, {
    structuredFacts: facts,
    requiredSourceFacts: [{ key: 'preliminaryDiagnosis', label: '初步诊断', value: '肝脓肿', sourceId: 'header_source', certainty: 'preliminary' }]
  });
  assert.ok(requiredHeader.hardErrors.some(function (item) { return item.code === 'SOURCE_HEADER_FACT_MISSING'; }));
  assert.strictEqual(generationResultState({ bodyText: validBody, quality: requiredHeader }).status, 'needs_review');

  var semanticTemplate = {
    generationContract: {
      sections: ['\u4e00\u822c\u8d44\u6599', '\u4e3b\u8bc9', '\u73b0\u75c5\u53f2', '\u8f85\u52a9\u68c0\u67e5', '\u8bca\u65ad\u7ed3\u8bba']
    }
  };
  var misplacedBody = [
    '\u4e00\u822c\u8d44\u6599', '\u59d3\u540d\uff1a\u738b\u5927\u529b', '',
    '\u4e3b\u8bc9', '\u809d\u8113\u80bf\u3002', '',
    '\u73b0\u75c5\u53f2', '\u672c\u6b21\u68c0\u9a8c\u7533\u8bf7\u65e5\u671f\u4e3a2024\u5e744\u67083\u65e5\uff0c\u6807\u672c\u7c7b\u578b\u4e3a\u8840\u6e05\uff0c\u68c0\u9a8c\u4eea\u5668\u4e3a\u751f\u5316AU5800\u3002', '',
    '\u8f85\u52a9\u68c0\u67e5', '\u62a5\u544a\u8868\u5934\u8865\u5145\uff08\u6765\u6e902\uff09\uff1a\u6807\u672c\u7c7b\u578b\uff1a\u8840\u6e05\u3002', '',
    '\u8bca\u65ad\u7ed3\u8bba', '\u521d\u6b65\u8bca\u65ad\uff1a\u809d\u8113\u80bf\u3002'
  ].join('\n');
  var semanticFacts = [
    { key: 'preliminaryDiagnosis', value: '\u809d\u8113\u80bf', certainty: 'preliminary' },
    { key: 'specimenType', value: '\u8840\u6e05', sourceIndex: 2 },
    { key: 'instrument', value: '\u751f\u5316AU5800', sourceIndex: 2 }
  ];
  var semanticSafe = removeMisplacedReportFacts(misplacedBody, semanticFacts, semanticTemplate);
  assert.ok(!/(?:^|\n)\u4e3b\u8bc9(?:\n|$)/.test(semanticSafe), 'preliminary diagnosis must not become chief complaint');
  assert.ok(!/(?:^|\n)\u73b0\u75c5\u53f2(?:\n|$)/.test(semanticSafe), 'lab report metadata must not become present illness');
  assert.ok(semanticSafe.includes('\u521d\u6b65\u8bca\u65ad\uff1a\u809d\u8113\u80bf'), 'preliminary diagnosis must remain in diagnosis section');
  assert.ok(semanticSafe.includes('\u62a5\u544a\u8868\u5934\u8865\u5145\uff08\u6765\u6e902\uff09'), 'source-scoped report facts must remain in auxiliary examination');
  var misplacedDiagnosis = removeMisplacedReportFacts(
    '\u4e00\u822c\u8d44\u6599\n\u59d3\u540d\uff1a\u738b\u5927\u529b\u3002\u521d\u6b65\u8bca\u65ad\uff1a\u809d\u8113\u80bf\u3002\n\n\u8f85\u52a9\u68c0\u67e5\n\u5df2\u63d0\u4f9b\u68c0\u9a8c\u7ed3\u679c\u3002',
    semanticFacts,
    semanticTemplate
  );
  var correctedDiagnosis = materializeRequiredSourceFacts(misplacedDiagnosis, semanticFacts.slice(0, 1), []);
  assert.ok(!/\u738b\u5927\u529b\u3002\u521d\u6b65\u8bca\u65ad/.test(correctedDiagnosis), 'diagnosis must not remain inside general information');
  assert.ok(/\u8bca\u65ad\u7ed3\u8bba\n\u521d\u6b65\u8bca\u65ad\uff1a\u809d\u8113\u80bf\u3002/.test(correctedDiagnosis), 'preliminary diagnosis must be materialized under diagnosis conclusion');

  var store = {};
  var repository = createAiWorkspaceRepository(store);
  var workspace = await repository.createWorkspace({ userId: 'user_fixture', templateId: fixture.templateId, audience: 'professional' });
  var firstMaterial = fixture.materials[0];
  var material = await repository.addMaterial({
    workspaceId: workspace.id,
    userId: 'user_fixture',
    kind: firstMaterial.kind,
    text: '匿名化检验材料',
    clientMaterialId: 'fixture-material-a',
    sourceMeta: firstMaterial.sourceMeta,
    structuredFacts: firstMaterial.structuredFacts,
    qualityState: 'ready'
  });
  assert.strictEqual(material.structuredFacts.length, firstMaterial.structuredFacts.length);
  assert.strictEqual(material.qualityState, 'ready');
  var reviewedMaterial = await repository.addMaterial({
    workspaceId: workspace.id,
    userId: 'user_fixture',
    kind: firstMaterial.kind,
    text: 'reviewed material text',
    clientMaterialId: 'fixture-material-a',
    sourceMeta: Object.assign({}, firstMaterial.sourceMeta, { reviewed: true }),
    structuredFacts: firstMaterial.structuredFacts,
    qualityState: 'ready'
  });
  assert.strictEqual(reviewedMaterial.id, material.id, 'OCR retry must replace the same material');
  assert.strictEqual(reviewedMaterial.text, 'reviewed material text');
  assert.strictEqual((await repository.getWorkspace(workspace.id, 'user_fixture')).materialRevision, 2);
  var generation = await repository.createGeneration({
    workspaceId: workspace.id,
    userId: 'user_fixture',
    inputRevision: 2,
    idempotencyKey: 'fixture-generation',
    snapshot: { materials: [material] }
  });
  var claimToken = await repository.claimGeneration(generation.id, workspace.id, 'user_fixture');
  assert.ok(claimToken);
  assert.strictEqual(await repository.claimGeneration(generation.id, workspace.id, 'user_fixture'), '', 'only one caller may claim a generation');
  assert.strictEqual(await repository.completeGeneration(generation.id, 'user_fixture', 'wrong-token', { status: 'failed' }), null, 'only the lease owner may complete');
  var completed = await repository.completeGeneration(generation.id, 'user_fixture', claimToken, {
    status: 'completed', bodyText: validBody, pendingItems: [], qualityReport: valid, timings: { totalMs: 100 }
  });
  assert.strictEqual(completed.qualityReport.usedFactIds.length, facts.length);
  assert.strictEqual(completed.timings.totalMs, 100);
  var staleGeneration = await repository.createGeneration({
    workspaceId: workspace.id,
    userId: 'user_fixture',
    inputRevision: 2,
    idempotencyKey: 'fixture-stale-generation',
    snapshot: { materials: [reviewedMaterial] }
  });
  var staleToken = await repository.claimGeneration(staleGeneration.id, workspace.id, 'user_fixture');
  assert.ok(staleToken);
  var storedStale = store.aiGenerations.find(function (item) { return item.id === staleGeneration.id; });
  storedStale.claimedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  var recoveredToken = await repository.claimGeneration(staleGeneration.id, workspace.id, 'user_fixture');
  assert.ok(recoveredToken && recoveredToken !== staleToken, 'expired generation lease must be reclaimable');
  console.log('AI_WORKSPACE_GOLDEN_SMOKE_OK');
}

main().catch(function (error) {
  console.error(error.stack || error.message);
  process.exit(1);
});
