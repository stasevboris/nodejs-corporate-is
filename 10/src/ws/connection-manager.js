import { Envelope } from './envelope.js';

export class ConnectionManager {
  constructor() {
    this.clients = new Map(); // ws -> clientData
  }

  addClient(ws, user) {
    const clientData = {
      ws,
      user,
      id: user.sub,
      username: user.username,
      rooms: new Set(),
      isAlive: true,
      connectedAt: new Date().toISOString()
    };
    this.clients.set(ws, clientData);
    return clientData;
  }

  removeClient(ws) {
    const client = this.clients.get(ws);
    if (client) {
      this.clients.delete(ws);
    }
    return client;
  }

  getClient(ws) {
    return this.clients.get(ws);
  }

  findClientByUserId(userId) {
    for (const client of this.clients.values()) {
      if (client.id === userId) return client;
    }
    return null;
  }

  send(ws, type, payload = {}, replyTo = null) {
    if (ws.readyState === ws.OPEN) {
      ws.send(Envelope.stringify(type, payload, replyTo));
    }
  }

  broadcastAll(type, payload = {}, excludeWs = null) {
    const msg = Envelope.stringify(type, payload);
    for (const [ws] of this.clients.entries()) {
      if (ws !== excludeWs && ws.readyState === ws.OPEN) {
        ws.send(msg);
      }
    }
  }
}
