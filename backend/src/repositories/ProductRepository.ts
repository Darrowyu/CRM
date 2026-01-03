import { BaseRepository } from './BaseRepository.js';
import { Product, PricingTier, calculateTieredPrice } from '../models/Product.js';
import { query } from '../db/connection.js';

export class ProductRepository extends BaseRepository<Product> {
  constructor() {
    super('products');
  }

  async getPricingTiers(productId: string): Promise<PricingTier[]> { // 获取产品阶梯价格
    const result = await query(
      'SELECT * FROM pricing_tiers WHERE product_id = $1 ORDER BY min_quantity ASC',
      [productId]
    );
    return result.rows;
  }

  async addPricingTier(productId: string, minQuantity: number, unitPrice: number): Promise<PricingTier> { // 添加阶梯价格
    const result = await query(
      'INSERT INTO pricing_tiers (product_id, min_quantity, unit_price) VALUES ($1, $2, $3) RETURNING *',
      [productId, minQuantity, unitPrice]
    );
    return result.rows[0];
  }

  async calculatePrice(productId: string, quantity: number): Promise<number> { // 计算指定数量的单价
    const tiers = await this.getPricingTiers(productId);
    return calculateTieredPrice(tiers, quantity);
  }

  async findByIds(ids: string[]): Promise<Product[]> { // 批量获取产品
    if (!ids.length) return [];
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const result = await query(`SELECT * FROM products WHERE id IN (${placeholders})`, ids);
    return result.rows;
  }
}

export const productRepository = new ProductRepository();
