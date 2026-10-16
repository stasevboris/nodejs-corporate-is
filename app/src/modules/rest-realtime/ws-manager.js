import { Envelope } from './envelope.js';

export class ConnectionManager {
  constructor() {
    this.clients = new Map(); // ws -> clientData
  }

  addClient(ws, user) {
    const data = {
      ws,
      user,
      id: user.sub || user.id,
      username: user.username,
      rooms: new Set(),
      isAlive: true,
      connectedAt: new Date().toISOString()
    };
    this.clients.set(ws, data);
    return data;
  }

  removeClient(ws) {
    const client = this.clients.get(ws);
    if (client) this.clients.delete(ws);
    return client;
  }

  getClient(ws) {
    return this.clients.get(ws);
  }

  findClientByUserId(userId) {
    for (const c of this.clients.values()) {
      if (c.id === userId) return c;
    }
    return null;
  }

  send(ws, type, payload = {}, replyTo = null) {
    if (ws.readyState === ws.OPEN) {
      ws.send(Envelope.stringify(type, payload, replyTo));
    }
  }
}

export class RoomManager {
  constructor(connectionManager) {
    this.cm = connectionManager;
    this.rooms = new Map(); // roomName -> Set of ws
  }

  join(roomName, ws) {
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set());
    }
    const set = this.rooms.get(roomName);
    if (set.has(ws)) return false; // Идемпотентность!

    set.add(ws);
    const client = this.cm.getClient(ws);
    if (client) client.rooms.add(roomName);

    this.broadcastToRoom(roomName, 'room:user_joined', {
      room: roomName,
      userId: client?.id,
      username: client?.username,
      membersCount: set.size
    });
    return true;
  }

  leave(roomName, ws) {
    const set = this.rooms.get(roomName);
    if (!set || !set.has(ws)) return false;

    set.delete(ws);
    if (set.size === 0) this.rooms.delete(roomName);

    const client = this.cm.getClient(ws);
    if (client) client.rooms.delete(roomName);

    this.broadcastToRoom(roomName, 'room:user_left', {
      room: roomName,
      userId: client?.id,
      username: client?.username,
      membersCount: set.size
    });
    return true;
  }

  leaveAll(ws) {
    const client = this.cm.getClient(ws);
    if (!client) return;
    for (const r of Array.from(client.rooms)) {
      this.leave(r, ws);
    }
  }

  broadcastToRoom(roomName, type, payload = {}, excludeWs = null) {
    const set = this.rooms.get(roomName);
    if (!set) return;
    const msg = Envelope.stringify(type, payload);
    for (const ws of set) {
      if (ws !== excludeWs && ws.readyState === ws.OPEN) {
        ws.send(msg);
      }
    }
  }

  getRoomMembers(roomName) {
    const set = this.rooms.get(roomName);
    if (!set) return [];
    const members = [];
    for (const ws of set) {
      const c = this.cm.getClient(ws);
      if (c) members.push({ id: c.id, username: c.username });
    }
    return members;
  }
}
