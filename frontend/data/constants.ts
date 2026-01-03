import { Customer, CustomerStatus, Opportunity, OpportunityStage, UserRole } from '../types';

export const MOCK_USER = { id: 'u1', name: 'Alex Chen', role: UserRole.SALES_REP };

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'c1', company_name: 'TechFlow Manufacturing', industry: 'Electronics', contacts: [{ id: 'ct1', name: 'John Doe', phone: '13800138000', email: 'john.doe@techflow.com', role: 'Purchasing Manager' }], owner_id: 'u1', last_contact_date: '2024-05-10', status: CustomerStatus.PRIVATE, region: 'East China' },
  { id: 'c2', company_name: 'Global Med Supplies', industry: 'Healthcare', contacts: [{ id: 'ct2', name: 'Sarah Lee', phone: '13900139000', email: 'sarah.lee@globalmed.com', role: 'Director' }], owner_id: 'u1', last_contact_date: '2024-05-12', status: CustomerStatus.PRIVATE, region: 'North China' },
  { id: 'c3', company_name: 'AutoParts Prime', industry: 'Automotive', contacts: [{ id: 'ct3', name: 'Mike Ross', phone: '***', email: 'mike.ross@autoparts.com', role: 'Manager' }], owner_id: undefined, last_contact_date: '2024-01-10', status: CustomerStatus.PUBLIC_POOL, region: 'South China' },
  { id: 'c4', company_name: 'BuildRight Construction', industry: 'Construction', contacts: [{ id: 'ct4', name: 'Jenny Wu', phone: '***', email: 'jenny.wu@buildright.com', role: 'Site Manager' }], owner_id: undefined, last_contact_date: '2023-11-05', status: CustomerStatus.PUBLIC_POOL, region: 'West China' }
];

export const MOCK_OPPORTUNITIES: Opportunity[] = [
  { id: 'o1', customer_id: 'c1', customer_name: 'TechFlow Manufacturing', name: '电子元件采购', amount: 50000, stage: OpportunityStage.PROPOSAL, probability: 60, expected_close_date: '2024-06-15' },
  { id: 'o2', customer_id: 'c2', customer_name: 'Global Med Supplies', name: '医疗设备订单', amount: 120000, stage: OpportunityStage.NEGOTIATION, probability: 80, expected_close_date: '2024-05-30' },
  { id: 'o3', customer_id: 'c1', customer_name: 'TechFlow Manufacturing', name: 'Q3新需求', amount: 15000, stage: OpportunityStage.PROSPECTING, probability: 20, expected_close_date: '2024-07-01' }
];

export const TIERED_PRICING = [ // 阶梯定价
  { minQty: 1, price: 10.0 },
  { minQty: 10000, price: 9.5 },
  { minQty: 100000, price: 8.5 },
  { minQty: 1000000, price: 7.0 },
];

export const SALES_DATA = [ // 销售数据
  { name: 'Jan', sales: 4000, revenue: 2400 },
  { name: 'Feb', sales: 3000, revenue: 1398 },
  { name: 'Mar', sales: 2000, revenue: 9800 },
  { name: 'Apr', sales: 2780, revenue: 3908 },
  { name: 'May', sales: 1890, revenue: 4800 },
  { name: 'Jun', sales: 2390, revenue: 3800 },
];

export const FUNNEL_DATA = [ // 漏斗数据
  { name: 'Leads', value: 100, fill: '#8884d8' },
  { name: 'Qualified', value: 80, fill: '#83a6ed' },
  { name: 'Proposal', value: 50, fill: '#8dd1e1' },
  { name: 'Negotiation', value: 30, fill: '#82ca9d' },
  { name: 'Closed', value: 20, fill: '#a4de6c' },
];
