import { getDatabase } from '../db/connection.js';

export class InventoryLogsRepository {
  constructor(db = null) {
    this.db = db || getDatabase();
  }

  findByProductId(productId) {
    return this.db.prepare(`
      SELECT * FROM inventory_logs WHERE product_id = ? ORDER BY id DESC
    `).all(productId);
  }

  create(logData) {
    const stmt = this.db.prepare(`
      INSERT INTO inventory_logs (product_id, change_amount, previous_stock, new_stock, reason)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      logData.productId,
      logData.changeAmount,
      logData.previousStock,
      logData.newStock,
      logData.reason
    );
    return this.db.prepare('SELECT * FROM inventory_logs WHERE id = ?').get(Number(result.lastInsertRowid));
  }
}
