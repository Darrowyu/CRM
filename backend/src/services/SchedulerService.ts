import { customerRepository } from '../repositories/CustomerRepository.js';
import { INACTIVE_DAYS_LIMIT } from './CustomerService.js';
import logger from '../utils/logger.js';

export const returnInactiveCustomers = async (): Promise<number> => { // 自动回退超期客户到公海
  const inactiveCustomers = await customerRepository.findInactiveCustomers(INACTIVE_DAYS_LIMIT);
  let returnedCount = 0;
  
  for (const customer of inactiveCustomers) {
    await customerRepository.releaseCustomer(customer.id, '超过30天未跟进，自动回退公海');
    returnedCount++;
  }
  
  logger.info(`[Scheduler] Returned ${returnedCount} inactive customers to public pool`);
  return returnedCount;
};

export const startScheduler = () => { // 启动定时任务（每天凌晨2点执行）
  const runDaily = () => {
    const now = new Date();
    const next2AM = new Date(now);
    next2AM.setHours(2, 0, 0, 0);
    if (now >= next2AM) next2AM.setDate(next2AM.getDate() + 1);
    
    const delay = next2AM.getTime() - now.getTime();
    setTimeout(async () => {
      await returnInactiveCustomers();
      runDaily(); // 递归调度下一次
    }, delay);
  };
  
  runDaily();
  logger.info('[Scheduler] Auto-return scheduler started');
};
