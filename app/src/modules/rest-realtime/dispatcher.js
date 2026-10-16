import { Envelope } from './envelope.js';

export class MessageDispatcher {
  constructor(cm, rm) {
    this.cm = cm;
    this.rm = rm;
  }

  dispatch(ws, rawMsg) {
    const client = this.cm.getClient(ws);
    if (!client) return;

    let envelope;
    try {
      envelope = Envelope.parse(rawMsg);
    } catch (err) {
      return this.cm.send(ws, 'system:error', { message: err.message });
    }

    const { type, payload, id, ack } = envelope;

    switch (type) {
      case 'room:join': {
        const room = payload.room?.trim();
        if (!room) return this.cm.send(ws, 'system:error', { message: 'Имя комнаты обязательно' }, id);
        this.rm.join(room, ws);
        const members = this.rm.getRoomMembers(room);
        this.cm.send(ws, 'room:joined', { room, members }, id);
        break;
      }

      case 'room:leave': {
        const room = payload.room?.trim();
        if (room) {
          this.rm.leave(room, ws);
          this.cm.send(ws, 'room:left', { room }, id);
        }
        break;
      }

      case 'chat:message': {
        const room = payload.room?.trim();
        const text = payload.text?.trim();
        if (!room || !text) {
          return this.cm.send(ws, 'system:error', { message: 'Комната и текст сообщения обязательны' }, id);
        }

        const msgPayload = {
          room,
          senderId: client.id,
          senderName: client.username,
          text,
          timestamp: new Date().toISOString()
        };

        this.rm.broadcastToRoom(room, 'chat:message', msgPayload);
        if (ack) {
          this.cm.send(ws, 'chat:ack', { messageId: id, status: 'DELIVERED' }, id);
        }
        break;
      }

      case 'chat:typing': {
        const room = payload.room?.trim();
        if (room) {
          this.rm.broadcastToRoom(
            room,
            'chat:typing',
            { room, userId: client.id, username: client.username, isTyping: Boolean(payload.isTyping) },
            ws // excludeWs = ws: отправитель не получает индикатор своего набора!
          );
        }
        break;
      }

      case 'direct:message': {
        const recipientId = payload.recipientId;
        const text = payload.text?.trim();
        if (!recipientId || !text) {
          return this.cm.send(ws, 'system:error', { message: 'Получатель и текст обязательны' }, id);
        }

        const target = this.cm.findClientByUserId(recipientId);
        if (!target) {
          return this.cm.send(ws, 'system:error', { message: 'Пользователь не в сети' }, id);
        }

        const dmPayload = {
          fromUserId: client.id,
          fromUsername: client.username,
          text,
          timestamp: new Date().toISOString()
        };
        this.cm.send(target.ws, 'direct:message', dmPayload);
        if (ack) {
          this.cm.send(ws, 'direct:ack', { messageId: id, status: 'DELIVERED' }, id);
        }
        break;
      }

      default:
        this.cm.send(ws, 'system:error', { message: `Неизвестный тип: ${type}` }, id);
    }
  }
}
