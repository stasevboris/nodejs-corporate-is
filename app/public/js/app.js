let authData = null;
let currentWs = null;
let activeRoom = 'general';
let wsUsername = 'BorisUser';

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('nav.tabs button').forEach(el => el.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  event.target.classList.add('active');

  if (tabId === 'tab-mod1') loadSystemInfo();
  if (tabId === 'tab-mod3') loadProducts();
}

// ==========================================
// МОДУЛЬ 1-2
// ==========================================
async function loadSystemInfo() {
  const el = document.getElementById('sysInfoOutput');
  try {
    const res = await fetch('/api/system/info');
    const data = await res.json();
    el.innerText = JSON.stringify(data, null, 2);
  } catch (err) {
    el.innerText = `Ошибка загрузки: ${err.message}`;
  }
}

async function runExecCommand() {
  const cmd = document.getElementById('execCmdInput').value;
  const timeout = document.getElementById('execTimeoutInput').value;
  const el = document.getElementById('execOutput');
  el.innerText = 'Выполнение процесса...';
  try {
    const res = await fetch('/api/system/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd, timeout })
    });
    const data = await res.json();
    el.innerText = `[Код завершения: ${data.code}] ${data.timedOut ? '(Превышен таймаут!)' : ''}\n\n${data.output}`;
  } catch (err) {
    el.innerText = `Ошибка: ${err.message}`;
  }
}

// ==========================================
// МОДУЛЬ 3-4
// ==========================================
async function runStreamAudit() {
  const logEl = document.getElementById('sanitizedLogOutput');
  const alertEl = document.getElementById('auditStatsOutput');
  logEl.innerText = 'Обработка через ParserStream -> SanitizerStream...';
  alertEl.innerText = 'Анализ угроз в реальном времени...';

  try {
    const res = await fetch('/api/stream/audit-simulate', { method: 'POST' });
    const data = await res.json();
    logEl.innerText = JSON.stringify(data.sanitizedEntries, null, 2);
    alertEl.innerText = JSON.stringify(data.monitorStats, null, 2);
  } catch (err) {
    logEl.innerText = `Ошибка: ${err.message}`;
  }
}

// ==========================================
// МОДУЛЬ 5-6
// ==========================================
async function loadProducts() {
  const tbody = document.getElementById('productsTableBody');
  const logsEl = document.getElementById('inventoryLogsOutput');
  try {
    const [pRes, lRes] = await Promise.all([
      fetch('/api/inventory/products'),
      fetch('/api/inventory/logs')
    ]);
    const products = await pRes.json();
    const logs = await lRes.json();

    tbody.innerHTML = products.map(p => `
      <tr>
        <td>${p.id}</td>
        <td><code>${p.sku}</code></td>
        <td>${p.name}</td>
        <td>${p.category_name}</td>
        <td>$${p.price.toFixed(2)}</td>
        <td><strong>${p.stock}</strong> шт.</td>
        <td><button class="btn btn-outline" style="padding: 0.25rem 0.5rem;" onclick="selectProduct(${p.id})">Выбрать</button></td>
      </tr>
    `).join('');

    logsEl.innerText = JSON.stringify(logs, null, 2);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7">Ошибка: ${err.message}</td></tr>`;
  }
}

function selectProduct(id) {
  document.getElementById('adjProductId').value = id;
}

async function submitStockAdjustment() {
  const pId = document.getElementById('adjProductId').value;
  const amount = document.getElementById('adjAmount').value;
  const reason = document.getElementById('adjReason').value;
  const msgEl = document.getElementById('adjResultMsg');
  msgEl.innerText = 'Проведение транзакции...';
  msgEl.style.color = 'var(--text)';

  try {
    const res = await fetch('/api/inventory/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: pId, changeAmount: amount, reason })
    });
    const data = await res.json();
    if (!res.ok) {
      msgEl.innerText = `Транзакция отменена (ROLLBACK): ${data.detail || data.error}`;
      msgEl.style.color = 'var(--danger)';
    } else {
      msgEl.innerText = `Успешно (COMMIT): остаток изменен с ${data.previousStock} до ${data.newStock}`;
      msgEl.style.color = 'var(--success)';
      loadProducts();
    }
  } catch (err) {
    msgEl.innerText = `Ошибка сети: ${err.message}`;
    msgEl.style.color = 'var(--danger)';
  }
}

// ==========================================
// МОДУЛЬ 7-8
// ==========================================
async function login() {
  const username = document.getElementById('authUsername').value;
  const role = document.getElementById('authRole').value;
  const out = document.getElementById('jwtOutput');
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, role })
    });
    authData = await res.json();
    out.innerText = JSON.stringify(authData, null, 2);
  } catch (err) {
    out.innerText = `Ошибка: ${err.message}`;
  }
}

async function refreshToken() {
  const out = document.getElementById('jwtOutput');
  if (!authData || !authData.refreshToken) {
    out.innerText = 'Сначала выполните вход (Login)';
    return;
  }
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: authData.refreshToken })
    });
    const data = await res.json();
    if (!res.ok) {
      out.innerText = `Ошибка ротации: ${data.error}`;
    } else {
      authData.accessToken = data.accessToken;
      authData.refreshToken = data.refreshToken;
      out.innerText = `[RTR УСПЕШНО] Выпущена новая пара токенов:\n\n${JSON.stringify(data, null, 2)}`;
    }
  } catch (err) {
    out.innerText = `Ошибка: ${err.message}`;
  }
}

async function checkAdminZone() {
  const out = document.getElementById('rbacOutput');
  if (!authData || !authData.accessToken) {
    out.innerText = 'Сначала авторизуйтесь под ролью ADMIN или другой';
    return;
  }
  try {
    const res = await fetch('/api/auth/admin-zone', {
      headers: { 'Authorization': `Bearer ${authData.accessToken}` }
    });
    const data = await res.json();
    out.innerText = `[HTTP ${res.status}]\n${JSON.stringify(data, null, 2)}`;
  } catch (err) {
    out.innerText = `Ошибка: ${err.message}`;
  }
}

async function checkSessionState() {
  const out = document.getElementById('rbacOutput');
  try {
    const res = await fetch('/api/session/state');
    const data = await res.json();
    out.innerText = `[HMAC Signed Session Cookie State]\n${JSON.stringify(data, null, 2)}`;
  } catch (err) {
    out.innerText = `Ошибка: ${err.message}`;
  }
}

// ==========================================
// МОДУЛЬ 9-10 (REST & WEBSOCKET)
// ==========================================
async function createArticle() {
  const title = document.getElementById('artTitle').value;
  const content = document.getElementById('artContent').value;
  const out = document.getElementById('restOutput');
  out.innerText = 'Отправка POST /api/articles с валидацией Zod...';

  try {
    const res = await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, author: 'Стасев Б.В.', tags: ['enterprise'] })
    });
    const data = await res.json();
    out.innerText = `[HTTP ${res.status}]\n${JSON.stringify(data, null, 2)}`;
  } catch (err) {
    out.innerText = `Ошибка: ${err.message}`;
  }
}

// WebSocket клиент с гарантией одного соединения (без дублирования!)
function wsConnect() {
  wsUsername = document.getElementById('wsUserInput').value.trim() || 'BorisUser';

  // Если сокет уже открыт, корректно закрываем его перед созданием нового
  if (currentWs) {
    currentWs.onopen = null;
    currentWs.onmessage = null;
    currentWs.onerror = null;
    currentWs.onclose = null;
    currentWs.close();
    currentWs = null;
  }

  const tokenParam = authData?.accessToken ? `?token=${authData.accessToken}` : '';
  const socket = new WebSocket(`ws://${window.location.host}/ws${tokenParam}`);
  currentWs = socket;

  socket.onopen = () => {
    if (currentWs !== socket) return;
    appendWsSystemMsg(`Подключено к WebSocket как "${wsUsername}"`);
    wsJoin(activeRoom);
  };

  socket.onmessage = (e) => {
    if (currentWs !== socket) return;
    const packet = JSON.parse(e.data);

    if (packet.type === 'chat:message') {
      appendWsChatMsg(packet.payload);
    } else if (packet.type === 'chat:typing') {
      showWsTyping(packet.payload);
    } else if (packet.type === 'room:user_joined') {
      appendWsSystemMsg(`Пользователь ${packet.payload.username} вошел в #${packet.payload.room}`);
    } else if (packet.type === 'room:user_left') {
      appendWsSystemMsg(`Пользователь ${packet.payload.username} покинул #${packet.payload.room}`);
    }
  };

  socket.onclose = () => {
    if (currentWs !== socket) return;
    appendWsSystemMsg('Соединение разорвано');
    currentWs = null;
  };
}

function wsJoin(room) {
  if (!currentWs || currentWs.readyState !== WebSocket.OPEN) return;
  if (activeRoom !== room) {
    currentWs.send(JSON.stringify({ type: 'room:leave', payload: { room: activeRoom } }));
  }
  activeRoom = room;
  currentWs.send(JSON.stringify({ type: 'room:join', payload: { room } }));
  appendWsSystemMsg(`Переход в комнату #${room}`);
}

function wsSendMessage() {
  const input = document.getElementById('wsMsgInput');
  const text = input.value.trim();
  if (!text || !currentWs || currentWs.readyState !== WebSocket.OPEN) return;

  currentWs.send(JSON.stringify({
    id: crypto.randomUUID(),
    type: 'chat:message',
    payload: { room: activeRoom, text },
    ack: true
  }));
  input.value = '';
}

function wsSendTyping() {
  if (!currentWs || currentWs.readyState !== WebSocket.OPEN) return;
  currentWs.send(JSON.stringify({
    type: 'chat:typing',
    payload: { room: activeRoom, isTyping: true }
  }));
}

function appendWsChatMsg(msg) {
  const box = document.getElementById('wsChatBox');
  const div = document.createElement('div');
  const isMine = msg.senderName === wsUsername;
  div.className = `chat-bubble ${isMine ? 'mine' : 'other'}`;
  div.innerHTML = `<strong>${msg.senderName}</strong>: ${msg.text}`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function appendWsSystemMsg(text) {
  const box = document.getElementById('wsChatBox');
  const div = document.createElement('div');
  div.className = 'chat-bubble system';
  div.innerText = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

let typingTimer = null;
function showWsTyping(payload) {
  const el = document.getElementById('wsTypingBox');
  if (payload.isTyping && payload.username !== wsUsername) {
    el.innerText = `${payload.username} печатает...`;
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => { el.innerText = ''; }, 2000);
  }
}

// Загрузка начальных данных
window.addEventListener('DOMContentLoaded', () => {
  loadSystemInfo();
});
