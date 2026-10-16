export class DatabaseError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Запись не найдена в базе данных') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class InsufficientStockError extends Error {
  constructor(message = 'Недостаточно остатка товара на складе для выполнения операции') {
    super(message);
    this.name = 'InsufficientStockError';
  }
}
