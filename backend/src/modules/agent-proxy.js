const { config } = require('../config');

async function callAgentService(agentType, payload, options) {
  if (!config.agentServiceEnabled) {
    throw new Error('Agent service is not enabled');
  }
  if (!config.agentServiceUrl) {
    throw new Error('Agent service URL is not configured');
  }

  var url = config.agentServiceUrl.replace(/\/$/, '') + '/v1/agent/' + encodeURIComponent(agentType);
  var headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + config.agentServiceApiKey
  };
  if (options && options.requestId) {
    headers['X-Request-ID'] = options.requestId;
  }
  if (options && options.userId) {
    headers['X-User-ID'] = options.userId;
  }

  var controller = new AbortController();
  var timer = setTimeout(function () {
    controller.abort();
  }, config.agentServiceTimeout || 120000);

  try {
    var response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    var data = await response.json().catch(function () {
      return {};
    });
    if (!response.ok) {
      var message = data.detail || data.message || (data.error && data.error.message) || 'agent service error';
      throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
    }
    if (data.success === false) {
      throw new Error((data.error && data.error.message) || 'agent request failed');
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function streamAgentChat(payload, options, res) {
  if (!config.agentServiceEnabled) {
    throw new Error('Agent service is not enabled');
  }
  if (!config.agentServiceUrl) {
    throw new Error('Agent service URL is not configured');
  }

  var url = config.agentServiceUrl.replace(/\/$/, '') + '/v1/agent/chat/stream';
  var headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + config.agentServiceApiKey,
    Accept: 'text/event-stream'
  };
  if (options && options.requestId) {
    headers['X-Request-ID'] = options.requestId;
  }
  if (options && options.userId) {
    headers['X-User-ID'] = options.userId;
  }

  var controller = new AbortController();
  var timer = setTimeout(function () {
    controller.abort();
  }, config.agentServiceTimeout || 120000);

  try {
    var response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      var errorBody = await response.text().catch(function () {
        return '';
      });
      var message = 'agent service error';
      try {
        var parsed = JSON.parse(errorBody);
        message = parsed.detail || parsed.message || message;
      } catch (parseError) {
        if (errorBody) message = errorBody;
      }
      throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
    }

    if (!response.body || typeof response.body.getReader !== 'function') {
      var fallbackText = await response.text();
      res.write(fallbackText);
      return;
    }

    var reader = response.body.getReader();
    var decoder = new TextDecoder();
    while (true) {
      var chunk = await reader.read();
      if (chunk.done) break;
      if (chunk.value) {
        res.write(decoder.decode(chunk.value, { stream: true }));
      }
    }
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  callAgentService,
  streamAgentChat
};
