import crypto from 'node:crypto';

export function generateETag(resource) {
  const data = JSON.stringify({
    id: resource.id,
    version: resource.version,
    updatedAt: resource.updatedAt
  });
  const hash = crypto.createHash('md5').update(data).digest('hex').slice(0, 16);
  return `W/"${resource.version}-${hash}"`;
}
