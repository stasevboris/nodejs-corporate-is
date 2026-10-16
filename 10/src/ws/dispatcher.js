import { Envelope } from './envelope.js';

export class MessageDispatcher {
  constructor(connectionManager, roomManager) {
    this.cm = connectionManager;
    this.rm = roomManager;
  }

  dispatch(ws, rawMessage) {
    const client = this.cm.getClient(ws);
    if (!client) return;

    let envelope;
    try {
      envelope = Envelope.parse(rawMessage);
    } catch (err) {
      return this.cm.send(ws, 'system:error', { message: err.message });
    }

    const { type, payload, id, ack } = envelope;

    switch (type) {
      // 1. Присоединение к комнате
      case 'room:join': {
        const roomName = payload.room?.trim();
        if (!roomName) {
          return this.cm.send(ws, 'system:error', { message: 'Имя комнаты обязательно' }, id);
        }
        this.rm.join(roomName, ws);
        const members = this.rm.getRoomMembers(roomName);
        this.cm.send(ws, 'room:joined', { room: roomName, members }, id);
        break;
      }

      // 2. Выход из комнаты
      case 'room:leave': {
        const roomName = payload.room?.trim();
        if (roomName) {
          this.rm.leave(roomName, ws);
          this.cm.send(ws, 'room:left', { room: roomName }, id);
        }
        break;
      }

      // 3. Сообщение в комнату
      case 'chat:message': {
        const roomName = payload.room?.trim();
        const text = payload.text?.trim();
        if (!roomName || !text) {
          return this.cm.send(ws, 'system:error', { message: 'Комната и текст сообщения обязательны' }, id);
        }

        const msgPayload = {
          room: roomName,
          senderId: client.id,
          senderName: client.username,
          text,
          timestamp: new Date().toISOString()
        };

        // Отправляем всем в комнате
        this.rm.broadcastToRoom(roomName, 'chat:message', msgPayload);

        // Если запрошен ACK (подтверждение доставки)
        if (ack) {
          this.cm.send(ws, 'chat:ack', { messageId: id, status: 'DELIVERED' }, id);
        }
        break;
      }

      // 4. Индикатор набора текста (без эха отправителю)
      case 'chat:typing': {
        const roomName = payload.room?.trim();
        if (roomName) {
          this.rm.broadcastToRoom(
            roomName,
            'chat:typing',
            { room: roomName, userId: client.id, username: client.username, isTyping: Boolean(payload.isTyping) },
            ws // excludeWs = ws
          );
        }
        break;
      }

      // 5. Личное сообщение (Direct Message)
      case 'direct:message': {
        const recipientId = payload.recipientId;
        const text = payload.text?.trim();
        if (!recipientId || !text) {
          return this.cm.send(ws, 'system:error', { message: 'Получатель и текст обязательны' }, id);
        }

        const targetClient = this.cm.findClientByUserId(recipientId);
        if (!targetClient) {
          return this.cm.send(ws, 'system:error', { message: 'Пользователь не в сети' }, id);
        }

        const dmPayload = {
          fromUserId: client.id,
          fromUsername: client.username,
          text,
          timestamp: new Date().toISOString()
        };

        this.cm.send(targetClient.ws, 'direct:message', dmPayload);
        if (ack) {
          this.cm.send(ws, 'direct:ack', { messageId: id, status: 'DELIVERED' }, id);
        }
        break;
      }

      default:
        this.cm.send(ws, 'system:error', { message: `Неизвестный тип сообщения: ${type}` }, id);
    }
  }
}
