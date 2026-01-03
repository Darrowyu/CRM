import { BaseRepository } from './BaseRepository.js';
import { Order, OrderContract, CreateOrderDTO, generateOrderNumber, isValidContractFile } from '../models/Order.js';
import { query } from '../db/connection.js';
import { OrderStatus, PaymentStatus } from '../types/index.js';

export class OrderRepository extends BaseRepository<Order> {
  constructor() {
    super('orders');
  }

  async createOrder(data: CreateOrderDTO): Promise<Order> { // 创建订单
    return this.create({
      ...data,
      order_number: generateOrderNumber(),
      status: OrderStatus.PENDING,
      payment_status: PaymentStatus.UNPAID,
      payment_amount: 0
    } as Partial<Order>);
  }

  async addContract(orderId: string, fileUrl: string, fileName: string, fileType: string): Promise<OrderContract | { error: string }> {
    const validation = isValidContractFile(fileType, 0); // 文件大小在上传时验证
    if (!validation.valid) return { error: validation.error! };

    const result = await query(
      `INSERT INTO order_contracts (order_id, file_url, file_name, file_type) VALUES ($1, $2, $3, $4) RETURNING *`,
      [orderId, fileUrl, fileName, fileType]
    );
    return result.rows[0];
  }

  async getContracts(orderId: string): Promise<OrderContract[]> { // 获取订单合同
    const result = await query('SELECT * FROM order_contracts WHERE order_id = $1', [orderId]);
    return result.rows;
  }

  async findByCustomer(customerId: string): Promise<Order[]> { // 按客户查询订单
    const result = await query(
      'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC',
      [customerId]
    );
    return result.rows;
  }

  async updatePayment(orderId: string, amount: number): Promise<Order | null> { // 更新付款
    const order = await this.findById(orderId);
    if (!order) return null;

    const newAmount = order.payment_amount + amount;
    const paymentStatus = newAmount >= (order.total_amount || 0) 
      ? PaymentStatus.PAID 
      : newAmount > 0 ? PaymentStatus.PARTIAL : PaymentStatus.UNPAID;

    return this.update(orderId, { payment_amount: newAmount, payment_status: paymentStatus } as Partial<Order>);
  }
}

export const orderRepository = new OrderRepository();
