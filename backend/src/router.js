const { fail } = require('./http');

function createRouter() {
  var routes = [];

  function add(method, pattern, handler) {
    var keys = [];
    var source = pattern.replace(/:[^/]+/g, (token) => {
      keys.push(token.slice(1));
      return '([^/]+)';
    });
    routes.push({
      method: method,
      pattern: pattern,
      regex: new RegExp('^' + source + '$'),
      keys: keys,
      handler: handler
    });
  }

  async function handle(req, res, context) {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization,Content-Type'
      });
      res.end();
      return;
    }

    var url = new URL(req.url, 'http://localhost');
    for (var i = 0; i < routes.length; i += 1) {
      var route = routes[i];
      var match = url.pathname.match(route.regex);
      if (route.method === req.method && match) {
        var params = {};
        route.keys.forEach((key, index) => {
          params[key] = decodeURIComponent(match[index + 1]);
        });
        await route.handler(req, res, Object.assign({}, context, {
          params: params,
          query: Object.fromEntries(url.searchParams.entries())
        }));
        return;
      }
    }
    fail(res, 404, 'NOT_FOUND', 'route not found');
  }

  return {
    get: (pattern, handler) => add('GET', pattern, handler),
    post: (pattern, handler) => add('POST', pattern, handler),
    patch: (pattern, handler) => add('PATCH', pattern, handler),
    delete: (pattern, handler) => add('DELETE', pattern, handler),
    handle: handle
  };
}

module.exports = {
  createRouter
};
