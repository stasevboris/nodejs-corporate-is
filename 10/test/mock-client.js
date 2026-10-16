import { WebSocket } from 'ws';

export class MockClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.messages = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.on('open', () => resolve());
      this.ws.on('error', (err) => reject(err));
      this.ws.on('message', (data) => {
        try {
          this.messages.push(JSON.parse(data.toString()));
        } catch {
          this.messages.push(data.toString());
        }
      });
    });
  }

  send(type, payload = {}, ack = false) {
    this.ws.send(JSON.stringify({
      id: `client-msg-${Date.now()}`,
      type,
      payload,
      timestamp: new Date().toISOString(),
      ack
    }));
  }

  async waitForMessage(type, timeoutMs = 2000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const found = this.messages.find(m => m.type === type);
      if (found) return found;
      await new Promise(r => setTimeout(r, 50));
    }
    throw new Error(`Timeout waiting for message type: ${type}`);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}
