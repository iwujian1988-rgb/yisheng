const { config } = require('../src/config');
const directAi = require('../src/modules/direct-ai-chat');
const {
  createFirstCourseOfficialTemplate,
  createDischargeOrderOfficialTemplate,
  createConsultationOfficialTemplate
} = require('../src/data/official');

const cases = [
  {
    name: '会诊记录-口述加字段',
    template: createConsultationOfficialTemplate(new Date().toISOString()),
    facts: ['2型糖尿病', 'NRS2002评分2分', '近2年体重下降约5kg', '摄入约80%', '糖尿病饮食'],
    input: '患者2型糖尿病，今天吃得还可以，大概达到平时需要的八成。近两年体重下降约5公斤，NRS2002两分。建议继续糖尿病饮食，加强饮食宣教。'
  },
  {
    name: '首次病程-散乱记录',
    template: createFirstCourseOfficialTemplate(new Date().toISOString()),
    facts: ['发热3天', '最高39.2℃', '咳嗽', '头孢', '青霉素过敏'],
    input: '发热3天，最高39.2℃，伴咳嗽有少量黄痰。外院口服头孢两天效果一般。既往高血压5年，青霉素过敏。查体双肺呼吸音粗，右下肺可闻及湿啰音。今天收入院，计划完善血常规、CRP及胸部CT。'
  },
  {
    name: '出院记录-OCR式短句',
    template: createDischargeOrderOfficialTemplate(new Date().toISOString()),
    facts: ['社区获得性肺炎', '阿莫西林克拉维酸钾', '7天', '3天后复诊'],
    input: '出院诊断 社区获得性肺炎。住院后抗感染对症治疗，体温正常2天，咳嗽较前减轻。出院带药 阿莫西林克拉维酸钾 按处方继续口服7天。3天后呼吸科复诊，如高热气促及时就医。'
  }
];

function hasPlaceholder(body) {
  return /(未提供|待补充|不详|____|：\s*(?:\n|$))/m.test(body);
}

function countMatchedFacts(body, facts) {
  return facts.filter((fact) => body.includes(fact)).length;
}

async function main() {
  if (!directAi.isConfigured()) throw new Error('AI provider is not configured');
  console.log('provider=' + config.aiProvider + ', model=' + config.aiResolvedModel);
  let passed = 0;
  for (const item of cases) {
    const result = await directAi.callDirectAi('text', {
      mode: 'professional',
      task: 'organize',
      message: item.input,
      template: item.template,
      messages: []
    });
    const body = String(result.bodyText || result.resultText || '').trim();
    const matched = countMatchedFacts(body, item.facts);
    const placeholder = hasPlaceholder(body);
    const usable = body.length >= 80 && matched >= Math.ceil(item.facts.length * 0.8) && !placeholder;
    if (usable) passed += 1;
    console.log('\n[' + (usable ? 'PASS' : 'REVIEW') + '] ' + item.name);
    console.log('bodyLength=' + body.length + ', facts=' + matched + '/' + item.facts.length + ', placeholder=' + placeholder);
    console.log(body);
    if (Array.isArray(result.confirmItems) && result.confirmItems.length) {
      console.log('待确认：' + result.confirmItems.join('；'));
    }
  }
  console.log('\nQUALITY_SUMMARY ' + passed + '/' + cases.length + ' passed');
  if (passed !== cases.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error('QUALITY_EVAL_FAILED');
  console.error(error.message);
  process.exitCode = 1;
});
