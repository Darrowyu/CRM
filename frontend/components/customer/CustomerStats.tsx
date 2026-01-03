import React, { memo } from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import { RiseOutlined, TeamOutlined } from '@ant-design/icons';
import { Customer } from '../../services/customerService';
import { SOURCE_MAP } from './constants';
import dayjs from 'dayjs';

interface CustomerStatsProps {
  customers: Customer[];
  t: (key: string) => string;
}

const CustomerStats: React.FC<CustomerStatsProps> = memo(({ customers, t }) => {
  const industryTop3 = Object.entries(
    customers.reduce((acc: Record<string, number>, c) => {
      acc[c.industry || t('cust_unknown')] = (acc[c.industry || t('cust_unknown')] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}(${v})`).join(' ') || '-';

  const sourceTop3 = Object.entries(
    customers.reduce((acc: Record<string, number>, c) => {
      const s = SOURCE_MAP[c.source || ''] || t('cust_unknown');
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}(${v})`).join(' ') || '-';

  const new7days = customers.filter(c => c.created_at && dayjs(c.created_at).isAfter(dayjs().subtract(7, 'day'))).length;

  return (
    <Row gutter={16} style={{ marginBottom: 16 }}>
      <Col span={6}><Card size="small" variant="borderless"><Statistic title={t('cust_total')} value={customers.length} prefix={<TeamOutlined />} /></Card></Col>
      <Col span={6}><Card size="small" variant="borderless"><Statistic title={t('cust_industry_top3')} value={industryTop3} /></Card></Col>
      <Col span={6}><Card size="small" variant="borderless"><Statistic title={t('cust_source_top3')} value={sourceTop3} /></Card></Col>
      <Col span={6}><Card size="small" variant="borderless"><Statistic title={t('cust_new_7days')} value={new7days} prefix={<RiseOutlined />} /></Card></Col>
    </Row>
  );
});

export default CustomerStats;
