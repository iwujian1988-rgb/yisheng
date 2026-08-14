const { config } = require('../src/config');
const directAi = require('../src/modules/direct-ai-chat');
const {
  createFirstCourseOfficialTemplate,
  createDischargeOrderOfficialTemplate,
  createConsultationOfficialTemplate,
  createTalk72hOfficialTemplate,
  createAdmissionNoteOfficialTemplate
} = require('../src/data/official');

const cases = [
  {
    name: '会诊记录-口述加字段',
    template: createConsultationOfficialTemplate(new Date().toISOString()),
    facts: [/2型糖尿病/, /NRS2002.{0,16}2分/, /近(2|两)年(?:内|来)?.{0,12}(下降|减轻).{0,4}5\s*(kg|公斤)/i, /(摄入|进食).{0,12}(80%|八成)/, /糖尿病饮食/],
    forbidden: [/梅毒/, /营养不良/, /需关注营养状况/, /结合当前病情/, /营养状态/, /帮助患者更好/, /有助于|以促进/],
    input: '患者2型糖尿病，今天吃得还可以，大概达到平时需要的八成。近两年体重下降约5公斤，NRS2002两分。建议继续糖尿病饮食，加强饮食宣教。'
  },
  {
    name: '首次病程-散乱记录',
    template: createFirstCourseOfficialTemplate(new Date().toISOString()),
    facts: [/发热.{0,6}3天|3天前.{0,8}发热/, /39\.2\s*℃/, /咳嗽/, /头孢/, /青霉素过敏/],
    forbidden: [/社区获得性肺炎/, /高血压病(?!史)/, /鉴别诊断/, /肺结核/, /急性支气管炎/, /护理常规/, /制定抗感染方案/],
    input: '发热3天，最高39.2℃，伴咳嗽有少量黄痰。外院口服头孢两天效果一般。既往高血压5年，青霉素过敏。查体双肺呼吸音粗，右下肺可闻及湿啰音。今天收入院，计划完善血常规、CRP及胸部CT。'
  },
  {
    name: '出院记录-OCR式短句',
    template: createDischargeOrderOfficialTemplate(new Date().toISOString()),
    facts: [/社区获得性肺炎/, /阿莫西林克拉维酸钾/, /7天/, /3天后.{0,8}复诊/],
    forbidden: [/入院诊断：[^\n]+/, /治愈/, /痊愈/],
    input: '出院诊断 社区获得性肺炎。住院后抗感染对症治疗，体温正常2天，咳嗽较前减轻。出院带药 阿莫西林克拉维酸钾 按处方继续口服7天。3天后呼吸科复诊，如高热气促及时就医。'
  },
  {
    name: '72小时谈话-多来源摘要',
    template: createTalk72hOfficialTemplate(new Date().toISOString()),
    facts: [/2型糖尿病/, /空腹血糖.{0,8}12\.6/, /二甲双胍/, /低血糖/, /内分泌科.{0,8}随访/],
    forbidden: [/癌胚抗原/, /右肺多发小结节/, /胰岛素皮下泵/, /糖尿病大血管病变/],
    input: '入院后检查空腹血糖12.6mmol/L。目前诊断为2型糖尿病。已向患者及女儿说明住院期间可能出现血糖波动和低血糖风险。诊疗方案为糖尿病饮食，遵医嘱使用二甲双胍，并监测血糖。出院后规律用药，内分泌科随访。'
  },
  {
    name: '大病历-口述病史',
    template: createAdmissionNoteOfficialTemplate(new Date().toISOString()),
    facts: [/反复上腹痛.{0,6}(半年|6个月)/, /餐后加重/, /阑尾切除/, /青霉素过敏/, /36\.8\s*℃/, /128\/76\s*mmHg/],
    forbidden: [/糖尿病/, /空腹血糖/, /消化性溃疡/, /胃炎/, /幽门螺杆菌/],
    input: '主诉：反复上腹痛半年，近3天加重。现病史：半年前开始间断上腹隐痛，餐后加重，无呕血黑便，近3天疼痛加重来院。既往20年前行阑尾切除术。青霉素过敏。否认吸烟，偶尔饮酒。查体体温36.8℃，脉搏78次每分，呼吸18次每分，血压128/76mmHg；腹软，上腹轻压痛，无反跳痛。'
  }
];

function hasPlaceholder(body) {
  return /(未提供|待补充|不详|____)/m.test(body);
}

function countMatchedFacts(body, facts) {
  return facts.filter((fact) => fact.test(body)).length;
}

function findForbidden(body, patterns) {
  return (patterns || []).filter((pattern) => pattern.test(body)).map((pattern) => pattern.source);
}

async function main() {
  if (!directAi.isConfigured()) throw new Error('AI provider is not configured');
  console.log('provider=' + config.aiProvider + ', model=' + config.aiResolvedModel);
  let passed = 0;
  const caseFilter = String(process.env.QUALITY_CASE || '').trim();
  const selectedCases = caseFilter ? cases.filter((item) => item.name.includes(caseFilter)) : cases;
  if (!selectedCases.length) throw new Error('No quality cases matched QUALITY_CASE=' + caseFilter);
  for (const item of selectedCases) {
    const result = await directAi.callDirectAi('text', {
      mode: 'professional',
      task: 'organize',
      message: '',
      materialText: item.input,
      attachments: item.attachments || [],
      template: item.template,
      messages: []
    });
    const body = String(result.bodyText || result.resultText || '').trim();
    const matched = countMatchedFacts(body, item.facts);
    const placeholder = hasPlaceholder(body);
    const forbidden = findForbidden(body, item.forbidden);
    const markdown = /(\*\*|^---$)/m.test(body);
    const conversational = /(根据您提供的信息|如需补充.{0,8}告知)/.test(body);
    const pendingInBody = /^待确认(?:事项)?[：:]/m.test(body);
    const qualityStatus = result.quality && result.quality.status || 'missing';
    const richnessStatus = result.quality && result.quality.richness && result.quality.richness.status || 'missing';
    const usable = body.length >= 80
      && matched >= Math.ceil(item.facts.length * 0.8)
      && !placeholder
      && !forbidden.length
      && !markdown
      && !conversational
      && !pendingInBody
      && qualityStatus === 'passed'
      && richnessStatus === 'adequate';
    if (usable) passed += 1;
    console.log('\n[' + (usable ? 'PASS' : 'REVIEW') + '] ' + item.name);
    console.log('bodyLength=' + body.length + ', expansionRatio=' + (result.quality && result.quality.expansionRatio || 'n/a') + ', richness=' + richnessStatus + ', facts=' + matched + '/' + item.facts.length + ', placeholder=' + placeholder + ', markdown=' + markdown + ', conversational=' + conversational + ', pendingInBody=' + pendingInBody + ', quality=' + qualityStatus + ', forbidden=' + (forbidden.join('|') || 'none'));
    console.log(body);
    if (Array.isArray(result.confirmItems) && result.confirmItems.length) {
      console.log('待确认：' + result.confirmItems.join('；'));
    }
  }
  console.log('\nQUALITY_SUMMARY ' + passed + '/' + selectedCases.length + ' passed');
  if (passed !== selectedCases.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error('QUALITY_EVAL_FAILED');
  console.error(error.message);
  process.exitCode = 1;
});
