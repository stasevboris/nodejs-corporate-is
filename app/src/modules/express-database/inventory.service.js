export class InventoryService {
  constructor(db) {
    this.db = db;
  }

  adjustStock(productId, changeAmount, reason) {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      const product = this.db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
      if (!product) {
        throw new Error(`Товар с ID ${productId} не найден`);
      }

      const previousStock = product.stock;
      const newStock = previousStock + changeAmount;
      if (newStock < 0) {
        throw new Error(`Недостаточно товара на складе. Доступно: ${previousStock}, запрошено: ${Math.abs(changeAmount)}`);
      }

      this.db.prepare(`
        UPDATE products SET stock = ?, updated_at = datetime('now') WHERE id = ?
      `).run(newStock, productId);

      const logRes = this.db.prepare(`
        INSERT INTO inventory_logs (product_id, change_amount, previous_stock, new_stock, reason)
        VALUES (?, ?, ?, ?, ?)
      `).run(productId, changeAmount, previousStock, newStock, reason);

      this.db.exec('COMMIT;');
      return {
        success: true,
        productId,
        sku: product.sku,
        name: product.name,
        previousStock,
        newStock,
        changeAmount,
        logId: Number(logRes.lastInsertRowid)
      };
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }
}
