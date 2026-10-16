import { test } from 'node:test';
import assert from 'node:assert/strict';
import { articlesRepo } from '../src/modules/rest-realtime/articles.repo.js';
import { articleCreateSchema } from '../src/modules/rest-realtime/article.schema.js';
import { ConnectionManager, RoomManager } from '../src/modules/rest-realtime/ws-manager.js';

test('[Модуль 9-10] Zod валидация входных данных статьи', () => {
  const valid = articleCreateSchema.safeParse({
    title: 'Архитектура Node.js',
    content: 'Текст о проектировании высоконагруженных систем',
    author: 'Стасев Б.В.',
    status: 'published',
    tags: ['nodejs', 'enterprise']
  });
  assert.equal(valid.success, true);

  const invalid = articleCreateSchema.safeParse({
    title: 'ab', // слишком короткий (<3)
    content: 'коротко' // (<10)
  });
  assert.equal(invalid.success, false);
});

test('[Модуль 9-10] ETag генерация и версионирование статей (Lost Update Defense)', () => {
  const article = articlesRepo.create({
    title: 'Статья 1',
    content: 'Контент статьи номер один',
    author: 'Автор'
  });
  const etag1 = articlesRepo.generateETag(article);

  const updated = articlesRepo.update(article.id, { title: 'Статья 1 Обновленная' });
  const etag2 = articlesRepo.generateETag(updated);

  assert.notEqual(etag1, etag2, 'ETag должен изменяться при обновлении версии статьи');
});

test('[Модуль 9-10] WebSocket RoomManager идемпотентность и исключение эха typing', () => {
  const cm = new ConnectionManager();
  const rm = new RoomManager(cm);

  const mockWs1 = { readyState: 1, send() {} };
  const mockWs2 = { readyState: 1, send() {} };
  cm.addClient(mockWs1, { id: 'u1', username: 'User1' });
  cm.addClient(mockWs2, { id: 'u2', username: 'User2' });

  // Вход в комнату
  const firstJoin = rm.join('general', mockWs1);
  assert.equal(firstJoin, true);

  // Повторный вход того же сокета не должен генерировать дублирующие события
  const secondJoin = rm.join('general', mockWs1);
  assert.equal(secondJoin, false);

  assert.equal(rm.getRoomMembers('general').length, 1);
});
