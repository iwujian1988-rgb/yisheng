const DIRECT_MEDICAL_TERMS = [
  /病历|处方|诊断书|检验报告|化验单|医嘱|门诊病历|住院病案|治疗方案|用药方案/,
  /medical\s*record|prescription|diagnosis\s*report|lab\s*report/i
];

const SUBJECT_TERMS = /患者|病人|病患|patient/i;
const CLINICAL_TERMS = /疾病|症状|用药|检查|治疗|手术|医生|病情|诊断|药物|化验|检验|clinic|disease|symptom|medication|doctor|treatment/i;

function containsMedicalContent(value) {
  var text = String(value || '').trim();
  if (!text) return false;
  if (DIRECT_MEDICAL_TERMS.some(function (pattern) { return pattern.test(text); })) return true;
  return SUBJECT_TERMS.test(text) && CLINICAL_TERMS.test(text);
}

function containsMedicalContentInMessages(messages) {
  if (!Array.isArray(messages)) return false;
  return messages.some(function (message) {
    if (typeof message === 'string') return containsMedicalContent(message);
    return message && containsMedicalContent(message.content || message.text || message.message);
  });
}

module.exports = {
  containsMedicalContent: containsMedicalContent,
  containsMedicalContentInMessages: containsMedicalContentInMessages
};
