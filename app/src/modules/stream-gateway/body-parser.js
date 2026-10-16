export function parseRawBody(req, limitBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on('data', chunk => {
      size += chunk.length;
      if (size > limitBytes) {
        const err = new Error('Payload Too Large: превышен лимит 1 МБ');
        err.statusCode = 413;
        req.destroy();
        return reject(err);
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      const raw = Buffer.concat(chunks).toString('utf-8');
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        const parseErr = new Error(`Невалидный JSON: ${err.message}`);
        parseErr.statusCode = 400;
        reject(parseErr);
      }
    });

    req.on('error', reject);
  });
}
