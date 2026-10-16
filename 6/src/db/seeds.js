import { getDatabase } from './connection.js';

export function runSeeds(db = null) {
  const conn = db || getDatabase();

  // Очистка перед сидом
  conn.exec(`
    DELETE FROM inventory_logs;
    DELETE FROM products;
    DELETE FROM categories;
  `);

  const insertCategory = conn.prepare(`
    INSERT INTO categories (name, description) VALUES (?, ?)
  `);
  insertCategory.run('Электроника', 'Компьютеры, серверы и периферия');
  insertCategory.run('Сетевое оборудование', 'Маршрутизаторы, коммутаторы, кабели');

  const insertProduct = conn.prepare(`
    INSERT INTO products (category_id, sku, name, price, stock) VALUES (?, ?, ?, ?, ?)
  `);
  insertProduct.run(1, 'SRV-DL380', 'Сервер HPE ProLiant DL380 Gen10', 450000.0, 5);
  insertProduct.run(1, 'NB-THINKPAD', 'Ноутбук Lenovo ThinkPad X1', 120000.0, 15);
  insertProduct.run(2, 'SW-CISCO-2960', 'Коммутатор Cisco Catalyst 2960', 65000.0, 8);

  const insertLog = conn.prepare(`
    INSERT INTO inventory_logs (product_id, change_amount, previous_stock, new_stock, reason) VALUES (?, ?, ?, ?, ?)
  `);
  insertLog.run(1, 5, 0, 5, 'Начальная поставка на склад');
  insertLog.run(2, 15, 0, 15, 'Начальная поставка на склад');
  insertLog.run(3, 8, 0, 8, 'Начальная поставка на склад');

  console.log('[DB] Тестовые данные (сиды) успешно загружены.');
}
