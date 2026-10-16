import crypto from 'node:crypto';

export class Envelope {
  static create(type, payload = {}, replyTo = null) {
    return {
      id: crypto.randomUUID(),
      type,
      payload,
      timestamp: new Date().toISOString(),
      ...(replyTo ? { replyTo } : {})
    };
  }

  static parse(rawString) {
    try {
      const data = JSON.parse(rawString);
      if (!data.type || typeof data.type !== 'string') {
        throw new Error('Поле "type" обязательно в конверте сообщения');
      }
      return {
        id: data.id || crypto.randomUUID(),
        type: data.type,
        payload: data.payload || {},
        timestamp: data.timestamp || new Date().toISOString(),
        replyTo: data.replyTo || null,
        ack: Boolean(data.ack)
      };
    } catch (e) {
      throw new Error(`Невалидный формат пакета Envelope: ${e.message}`);
    }
  }

  static stringify(type, payload = {}, replyTo = null) {
    return JSON.stringify(this.create(type, payload, replyTo));
  }
}
