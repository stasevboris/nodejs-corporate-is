import { Envelope } from './envelope.js';

export class RoomManager {
  constructor(connectionManager) {
    this.cm = connectionManager;
    this.rooms = new Map(); // roomName -> Set of ws
  }

  join(roomName, ws) {
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set());
    }

    const roomSet = this.rooms.get(roomName);
    // Повторный room:join от того же сокета не является новым входом.
    // Без этой проверки событие room:user_joined дублировалось бы в UI.
    if (roomSet.has(ws)) {
      return false;
    }

    roomSet.add(ws);

    const client = this.cm.getClient(ws);
    if (client) {
      client.rooms.add(roomName);
    }

    this.broadcastToRoom(roomName, 'room:user_joined', {
      room: roomName,
      userId: client?.id,
      username: client?.username,
      membersCount: roomSet.size
    });
    return true;
  }

  leave(roomName, ws) {
    const roomSet = this.rooms.get(roomName);
    if (!roomSet || !roomSet.has(ws)) {
      return false;
    }

    roomSet.delete(ws);
    if (roomSet.size === 0) {
      this.rooms.delete(roomName);
    }

    const client = this.cm.getClient(ws);
    if (client) {
      client.rooms.delete(roomName);
    }

    this.broadcastToRoom(roomName, 'room:user_left', {
      room: roomName,
      userId: client?.id,
      username: client?.username,
      membersCount: roomSet.size
    });
    return true;
  }

  leaveAll(ws) {
    const client = this.cm.getClient(ws);
    if (!client) return;

    for (const roomName of Array.from(client.rooms)) {
      this.leave(roomName, ws);
    }
  }

  broadcastToRoom(roomName, type, payload = {}, excludeWs = null) {
    const roomSet = this.rooms.get(roomName);
    if (!roomSet) return;

    const msg = Envelope.stringify(type, payload);
    for (const ws of roomSet) {
      if (ws !== excludeWs && ws.readyState === ws.OPEN) {
        ws.send(msg);
      }
    }
  }

  getRoomMembers(roomName) {
    const roomSet = this.rooms.get(roomName);
    if (!roomSet) return [];
    const members = [];
    for (const ws of roomSet) {
      const client = this.cm.getClient(ws);
      if (client) {
        members.push({ id: client.id, username: client.username });
      }
    }
    return members;
  }
}
