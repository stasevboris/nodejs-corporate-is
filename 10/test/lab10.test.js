import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';
import { signToken } from '../src/utils/jwt.js';
import { MockClient } from './mock-client.js';

let serverInstance;
let server;
let wsContext;
let wsPort;

before(async () => {
  serverInstance = createServer();
  server = serverInstance.server;
  wsContext = serverInstance.wsContext;

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      wsPort = server.address().port;
      resolve();
    });
  });
});

after(async () => {
  if (wsContext.heartbeatInterval) clearInterval(wsContext.heartbeatInterval);
  wsContext.wss.close();
  await new Promise((resolve) => server.close(resolve));
});

test('HTTP Upgrade without token is rejected with 401', async () => {
  const client = new MockClient(`ws://127.0.0.1:${wsPort}/ws`);
  await assert.rejects(
    async () => {
      await client.connect();
    },
    /Unexpected server response: 401/
  );
});

test('HTTP Upgrade with valid JWT establishes connection and receives welcome', async () => {
  const token = signToken({ id: 'usr-1', username: 'Alice' });
  const client = new MockClient(`ws://127.0.0.1:${wsPort}/ws?token=${token}`);
  await client.connect();

  const welcome = await client.waitForMessage('system:welcome');
  assert.equal(welcome.payload.user.username, 'Alice');

  client.close();
});

test('Room isolation: messages broadcast only to subscribed room members', async () => {
  const tokenA = signToken({ id: 'usr-alice', username: 'Alice' });
  const tokenB = signToken({ id: 'usr-bob', username: 'Bob' });
  const tokenC = signToken({ id: 'usr-charlie', username: 'Charlie' });

  const clientA = new MockClient(`ws://127.0.0.1:${wsPort}/ws?token=${tokenA}`);
  const clientB = new MockClient(`ws://127.0.0.1:${wsPort}/ws?token=${tokenB}`);
  const clientC = new MockClient(`ws://127.0.0.1:${wsPort}/ws?token=${tokenC}`);

  await Promise.all([clientA.connect(), clientB.connect(), clientC.connect()]);

  // A and B join room "engineering"
  clientA.send('room:join', { room: 'engineering' });
  clientB.send('room:join', { room: 'engineering' });
  // C joins room "marketing"
  clientC.send('room:join', { room: 'marketing' });

  await Promise.all([
    clientA.waitForMessage('room:joined'),
    clientB.waitForMessage('room:joined'),
    clientC.waitForMessage('room:joined')
  ]);

  // A sends message to "engineering"
  clientA.send('chat:message', { room: 'engineering', text: 'Hello engineers!' }, true);

  // B must receive the message
  const msgOnB = await clientB.waitForMessage('chat:message');
  assert.equal(msgOnB.payload.text, 'Hello engineers!');
  assert.equal(msgOnB.payload.senderName, 'Alice');

  // A receives ACK
  const ackOnA = await clientA.waitForMessage('chat:ack');
  assert.equal(ackOnA.payload.status, 'DELIVERED');

  // C in "marketing" must NOT receive engineering message
  const hasMsgOnC = clientC.messages.some(m => m.payload?.text === 'Hello engineers!');
  assert.equal(hasMsgOnC, false);

  clientA.close();
  clientB.close();
  clientC.close();
});

test('Repeated room:join from one socket is idempotent', async () => {
  const token = signToken({ id: 'usr-repeat', username: 'RepeatUser' });
  const client = new MockClient(`ws://127.0.0.1:${wsPort}/ws?token=${token}`);
  await client.connect();

  client.send('room:join', { room: 'idempotent-room' });
  await client.waitForMessage('room:joined');

  // Повторная команда не должна генерировать второе событие входа.
  client.send('room:join', { room: 'idempotent-room' });
  await new Promise(resolve => setTimeout(resolve, 100));

  const joinedEvents = client.messages.filter(
    message => message.type === 'room:user_joined'
  );
  assert.equal(joinedEvents.length, 1);
  assert.equal(wsContext.rm.getRoomMembers('idempotent-room').length, 1);

  client.close();
});

test('Typing indicator broadcasts to room without echo to sender', async () => {
  const tokenA = signToken({ id: 'usr-a', username: 'Alice' });
  const tokenB = signToken({ id: 'usr-b', username: 'Bob' });

  const clientA = new MockClient(`ws://127.0.0.1:${wsPort}/ws?token=${tokenA}`);
  const clientB = new MockClient(`ws://127.0.0.1:${wsPort}/ws?token=${tokenB}`);

  await Promise.all([clientA.connect(), clientB.connect()]);
  clientA.send('room:join', { room: 'dev' });
  clientB.send('room:join', { room: 'dev' });

  await Promise.all([
    clientA.waitForMessage('room:joined'),
    clientB.waitForMessage('room:joined')
  ]);

  // A notifies typing
  clientA.send('chat:typing', { room: 'dev', isTyping: true });

  // B receives typing notification
  const typingOnB = await clientB.waitForMessage('chat:typing');
  assert.equal(typingOnB.payload.username, 'Alice');
  assert.equal(typingOnB.payload.isTyping, true);

  // A must NOT receive its own typing echo
  const echoOnA = clientA.messages.some(m => m.type === 'chat:typing');
  assert.equal(echoOnA, false);

  clientA.close();
  clientB.close();
});

test('Direct Message delivers payload to target user with delivery ACK', async () => {
  const tokenA = signToken({ id: 'target-alice', username: 'Alice' });
  const tokenB = signToken({ id: 'sender-bob', username: 'Bob' });

  const clientA = new MockClient(`ws://127.0.0.1:${wsPort}/ws?token=${tokenA}`);
  const clientB = new MockClient(`ws://127.0.0.1:${wsPort}/ws?token=${tokenB}`);

  await Promise.all([clientA.connect(), clientB.connect()]);

  // B sends direct message to A
  clientB.send('direct:message', { recipientId: 'target-alice', text: 'Private secret message' }, true);

  // A receives direct message
  const dmOnA = await clientA.waitForMessage('direct:message');
  assert.equal(dmOnA.payload.fromUsername, 'Bob');
  assert.equal(dmOnA.payload.text, 'Private secret message');

  // B receives direct ACK
  const ackOnB = await clientB.waitForMessage('direct:ack');
  assert.equal(ackOnB.payload.status, 'DELIVERED');

  clientA.close();
  clientB.close();
});
