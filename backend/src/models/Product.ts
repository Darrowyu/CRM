export interface Product {
  id: string;
  name: string;
  sku?: string;
  base_price: number;
  floor_price: number;
  created_at?: Date;
}

export interface PricingTier {
  id: string;
  product_id: string;
  min_quantity: number;
  unit_price: number;
  created_at?: Date;
}

export interface CreateProductDTO {
  name: string;
  sku?: string;
  base_price: number;
  floor_price: number;
}

// 计算阶梯价格
export const calculateTieredPrice = (tiers: PricingTier[], quantity: number): number => {
  if (!tiers.length) return 0;
  
  // 按min_quantity降序排序，找到第一个满足条件的tier
  const sortedTiers = [...tiers].sort((a, b) => b.min_quantity - a.min_quantity);
  const applicableTier = sortedTiers.find(t => quantity >= t.min_quantity);
  
  return applicableTier?.unit_price ?? tiers[0].unit_price;
};
