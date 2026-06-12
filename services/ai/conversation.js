var MAX_ROUNDS = 20;

function createConversation() {
  var messages = [];

  function reset() {
    messages = [];
  }

  function getMessages() {
    return messages;
  }

  function getRounds() {
    return Math.ceil(messages.length / 2);
  }

  function canContinue() {
    return getRounds() < MAX_ROUNDS;
  }

  function addUserMessage(content) {
    messages.push({
      role: 'user',
      content: String(content || ''),
      timestamp: Date.now()
    });
  }

  function addAssistantMessage(content) {
    messages.push({
      role: 'assistant',
      content: String(content || ''),
      timestamp: Date.now()
    });
  }

  function getHistoryForApi() {
    return messages.map(function (m) {
      return { role: m.role, content: m.content };
    });
  }

  function getDisplayMessages() {
    return messages.map(function (m, i) {
      return {
        id: i,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      };
    });
  }

  return {
    reset: reset,
    getMessages: getMessages,
    getRounds: getRounds,
    canContinue: canContinue,
    addUserMessage: addUserMessage,
    addAssistantMessage: addAssistantMessage,
    getHistoryForApi: getHistoryForApi,
    getDisplayMessages: getDisplayMessages
  };
}

module.exports = {
  createConversation: createConversation,
  MAX_ROUNDS: MAX_ROUNDS
};
