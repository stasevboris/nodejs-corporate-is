export class NativeRouter {
  constructor() {
    this.routes = [];
  }

  add(method, pathPattern, handler) {
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

  match(method, pathname) {
    const norm = method.toUpperCase();
    for (const r of this.routes) {
      if (r.method !== norm) continue;
      const m = pathname.match(r.regex);
      if (m) {
        const params = {};
        r.paramNames.forEach((n, idx) => {
          params[n] = decodeURIComponent(m[idx + 1]);
        });
        return { handler: r.handler, params };
      }
    }
    return null;
  }
}
