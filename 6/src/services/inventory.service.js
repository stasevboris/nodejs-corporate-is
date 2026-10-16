import { getDatabase } from '../db/connection.js';
import { ProductsRepository } from '../repositories/products.repo.js';
import { InventoryLogsRepository } from '../repositories/inventory-logs.repo.js';
import { NotFoundError, InsufficientStockError } from '../errors/db-error.js';

export class InventoryService {
  constructor(db = null) {
    this.db = db || getDatabase();
    this.productsRepo = new ProductsRepository(this.db);
    this.logsRepo = new InventoryLogsRepository(this.db);
  }

  /**
   * Атомарная транзакция изменения остатков товара с аудитом
   */
  adjustStock(productId, changeAmount, reason) {
    this.db.exec('BEGIN TRANSACTION;');

    try {
      const product = this.productsRepo.findById(productId);
      if (!product) {
        throw new NotFoundError(`Товар с ID ${productId} не найден`);
      }

      const previousStock = product.stock;
      const newStock = previousStock + changeAmount;

      if (newStock < 0) {
        throw new InsufficientStockError(
          `Недостаточно товара "${product.name}" на складе. Текущий остаток: ${previousStock}, запрошено списание: ${Math.abs(changeAmount)}`
        );
      }

      // Обновляем остаток
      this.productsRepo.updateStock(productId, newStock);

      // Записываем лог движения
      const logEntry = this.logsRepo.create({
        productId,
        changeAmount,
        previousStock,
        newStock,
        reason
      });

      this.db.exec('COMMIT;');

      return {
        success: true,
        productId,
        sku: product.sku,
        previousStock,
        newStock,
        changeAmount,
        logId: logEntry.id
      };
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }
}
