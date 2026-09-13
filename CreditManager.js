// CreditManager.js
import { DurableObject } from "cloudflare:workers";

export class CreditManager extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // در اینجا می‌توانی ساختار جدول SQLite را در صورت نیاز بسازی
    // this.ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS credits (userId TEXT PRIMARY KEY, amount INTEGER)`);
  }

  // متد برای دریافت اعتبار یک کاربر
  async getCredits(userId) {
    const result = this.ctx.storage.sql.exec(
      `SELECT amount FROM credits WHERE userId = ?`, userId
    ).one();
    return result ? result.amount : 0; // اگر کاربر پیدا نشد، صفر برگردان
  }

  // متد برای اضافه کردن اعتبار (اتمیک)
  async addCredits(userId, amount) {
    this.ctx.storage.sql.exec(
      `INSERT INTO credits (userId, amount) VALUES (?, ?)
       ON CONFLICT(userId) DO UPDATE SET amount = amount + ?`,
      userId, amount, amount
    );
  }

  // متد برای کم کردن اعتبار (اتمیک و امن)
  async deductCredit(userId) {
    // این عملیات در یک تراکنش اتمیک انجام می‌شود
    const result = this.ctx.storage.sql.exec(
      `UPDATE credits SET amount = amount - 1 WHERE userId = ? AND amount > 0`,
      userId
    );
    // اگر تغییر کرد، یعنی اعتبار کافی بود
    return result.rowsWritten > 0;
  }
}