export function parseJsonBody(req, limitBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        const err = new Error('Payload Too Large: размер тела запроса превышает допустимый лимит 1MB');
        err.statusCode = 413;
        err.code = 'PAYLOAD_TOO_LARGE';
        req.destroy();
        return reject(err);
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (chunks.length === 0) {
        return resolve({});
      }
      const raw = Buffer.concat(chunks).toString('utf-8');
      if (!raw.trim()) {
        return resolve({});
      }
      try {
        const parsed = JSON.parse(raw);
        resolve(parsed);
      } catch (e) {
        const err = new Error(`Невалидный JSON: ${e.message}`);
        err.statusCode = 400;
        err.code = 'INVALID_JSON';
        reject(err);
      }
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}
