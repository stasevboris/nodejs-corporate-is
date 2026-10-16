let ws = null;
let currentRoom = 'general';
let username = '';
let token = '';
let reconnectTimer = null;
let connectInProgress = false;

function logPacket(direction, type, data) {
  const container = document.getElementById('packetLog');
  const div = document.createElement('div');
  div.className = `packet-entry ${direction}`;
  div.innerText = `[${direction.toUpperCase()}] ${type} -> ${JSON.stringify(data)}`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function scheduleReconnect() {
  if (reconnectTimer !== null) return;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect(true);
  }, 3000);
}

async function connect(isReconnect = false) {
  if (connectInProgress) return;

  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  // Если сокет уже существует и пользователь нажимает "Подключиться" снова (например, сменил имя),
  // необходимо начисто закрыть старое соединение и снять обработчики, чтобы сокеты не копились.
  if (!isReconnect && ws) {
    try {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null; // Предотвращаем срабатывание scheduleReconnect от старого сокета
      ws.close();
    } catch (e) {
      console.warn('[WS] Ошибка закрытия предыдущего сокета:', e);
    }
    ws = null;
  }

  connectInProgress = true;
  username = document.getElementById('usernameInput').value.trim() || 'StefanUser';

  try {
    // Получаем токен
    const tokenRes = await fetch('/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    if (!tokenRes.ok) {
      throw new Error(`Не удалось получить JWT: HTTP ${tokenRes.status}`);
    }

    const data = await tokenRes.json();
    token = data.token;

    const socket = new WebSocket(`ws://${window.location.host}/ws?token=${token}`);
    ws = socket;

    socket.onopen = () => {
      if (ws !== socket) return;
      document.getElementById('statusBadge').innerText = 'Online';
      document.getElementById('statusBadge').style.color = '#4ade80';
      joinRoom(currentRoom);
    };

    socket.onmessage = (event) => {
      // Игнорируем пакеты, если сокет уже заменен на более новый
      if (ws !== socket) return;

      const packet = JSON.parse(event.data);
      logPacket('in', packet.type, packet.payload);

      if (packet.type === 'chat:message') {
        appendChatMessage(packet.payload);
      } else if (packet.type === 'chat:typing') {
        showTyping(packet.payload);
      } else if (packet.type === 'room:user_joined') {
        appendSystemMessage(`Пользователь ${packet.payload.username} вошел в комнату.`);
      } else if (packet.type === 'room:user_left') {
        appendSystemMessage(`Пользователь ${packet.payload.username} покинул комнату.`);
      }
    };

    socket.onclose = () => {
      if (ws !== socket) return;
      ws = null;
      document.getElementById('statusBadge').innerText = 'Offline (переподключение...)';
      document.getElementById('statusBadge').style.color = '#f87171';
      scheduleReconnect();
    };

    socket.onerror = (err) => {
      console.error('[WS Error]', err);
    };
  } catch (error) {
    console.error('[WS] Ошибка подключения:', error);
    document.getElementById('statusBadge').innerText = 'Offline (ошибка)';
    document.getElementById('statusBadge').style.color = '#f87171';
    scheduleReconnect();
  } finally {
    connectInProgress = false;
  }
}

function sendPacket(type, payload = {}, ack = false) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const packet = {
      id: crypto.randomUUID(),
      type,
      payload,
      timestamp: new Date().toISOString(),
      ack
    };
    ws.send(JSON.stringify(packet));
    logPacket('out', type, payload);
  }
}

function joinRoom(room) {
  if (!room) return;

  // При переключении комнаты сначала отписываем текущий сокет от старой.
  // Иначе один пользователь остаётся участником всех ранее выбранных комнат.
  if (ws && ws.readyState === WebSocket.OPEN && currentRoom !== room) {
    sendPacket('room:leave', { room: currentRoom });
  }

  currentRoom = room;
  document.getElementById('chatTitle').innerText = `# ${room}`;
  sendPacket('room:join', { room });
}

function sendMessage() {
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  if (!text) return;
  sendPacket('chat:message', { room: currentRoom, text }, true);
  input.value = '';
}

function notifyTyping() {
  sendPacket('chat:typing', { room: currentRoom, isTyping: true });
}

function appendChatMessage(msg) {
  const win = document.getElementById('chatWindow');
  const div = document.createElement('div');
  const isMine = msg.senderName === username;
  div.className = `message-bubble ${isMine ? 'mine' : ''}`;
  div.innerHTML = `<strong>${msg.senderName}</strong>: ${msg.text}`;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
}

function appendSystemMessage(text) {
  const win = document.getElementById('chatWindow');
  const div = document.createElement('div');
  div.style.textAlign = 'center';
  div.style.color = '#94a3b8';
  div.style.fontSize = '0.85rem';
  div.innerText = text;
  win.appendChild(div);
}

let typingTimeout = null;
function showTyping(payload) {
  const el = document.getElementById('typingIndicator');
  if (payload.isTyping) {
    el.innerText = `${payload.username} печатает...`;
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => { el.innerText = ''; }, 2000);
  }
}

document.getElementById('connectBtn').addEventListener('click', connect);
document.getElementById('sendBtn').addEventListener('click', sendMessage);
document.getElementById('messageInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
  else notifyTyping();
});
