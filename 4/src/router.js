export class Router {
  constructor() {
    this.routes = [];
  }

  add(method, pathPattern, handler) {
    // Преобразуем /api/tasks/:id в regex /api/tasks/([^/]+)
    const paramNames = [];
    const regexStr = '^' + pathPattern.replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    }) + '$';

    this.routes.push({
      method: method.toUpperCase(),
      regex: new RegExp(regexStr),
      paramNames,
      handler
    });
  }

  get(path, handler) { this.add('GET', path, handler); }
  post(path, handler) { this.add('POST', path, handler); }
  put(path, handler) { this.add('PUT', path, handler); }
  patch(path, handler) { this.add('PATCH', path, handler); }
  delete(path, handler) { this.add('DELETE', path, handler); }
  options(path, handler) { this.add('OPTIONS', path, handler); }

  match(method, pathname) {
    const normMethod = method.toUpperCase();
    for (const route of this.routes) {
      if (route.method !== normMethod) continue;
      const match = pathname.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, index) => {
          params[name] = decodeURIComponent(match[index + 1]);
        });
        return { handler: route.handler, params };
      }
    }
    return null;
  }
}
