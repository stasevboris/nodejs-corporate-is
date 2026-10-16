import crypto from 'node:crypto';

export class Envelope {
  static stringify(type, payload = {}, replyTo = null, id = null) {
    return JSON.stringify({
      id: id || crypto.randomUUID(),
      type,
      payload,
      replyTo,
      timestamp: new Date().toISOString()
    });
  }

  static parse(raw) {
    const obj = JSON.parse(raw);
    if (!obj.type) throw new Error('Отсутствует обязательное поле type');
    return obj;
  }
}
