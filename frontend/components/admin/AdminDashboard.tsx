import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Tag, Space, App } from 'antd';
import { UserOutlined, TeamOutlined, ShoppingOutlined, FileTextOutlined, DollarOutlined, ContainerOutlined, CheckSquareOutlined, HistoryOutlined, DatabaseOutlined } from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../../contexts/LanguageContext';
import * as adminService from '../../services/adminService';

interface DashboardData {
  users: { total: number; sales_rep: number; manager: number };
  customers: { total: number; week_new: number };
  opportunities: { total: number; total_amount: number };
  quotes: { total: number; pending: number };
  orders: { total: number; total_amount: number };
  contracts: { total: number; expired: number };
  tasks: { total: number; overdue: number };
  logs: { total: number; today: number };
  loginTrend: { date: string; count: number }[];
  dbSize: number;
}

const AdminDashboard: React.FC = () => {
  const { t } = useLanguage();
  const { message } = App.useApp();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try { setData(await adminService.getDashboard()); }
      catch { message.error(t('error')); }
      setLoading(false);
    };
    fetch();
  }, []);

  const formatBytes = (bytes: number) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : bytes < 1024 * 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;

  const cards = [
    { title: t('admin_dash_users'), value: data?.users.total || 0, icon: <UserOutlined />, color: '#1890ff', extra: <span>{t('admin_dash_sales')} {data?.users.sales_rep || 0} / {t('admin_dash_managers')} {data?.users.manager || 0}</span> },
    { title: t('admin_dash_customers'), value: data?.customers.total || 0, icon: <TeamOutlined />, color: '#52c41a', extra: <Tag color="green">{t('admin_dash_week_new')} {data?.customers.week_new || 0}</Tag> },
    { title: t('admin_dash_active_opps'), value: data?.opportunities.total || 0, icon: <ShoppingOutlined />, color: '#faad14', extra: <span>¥{(data?.opportunities.total_amount || 0).toLocaleString()}</span> },
    { title: t('admin_dash_quotes'), value: data?.quotes.total || 0, icon: <FileTextOutlined />, color: '#722ed1', extra: data?.quotes.pending ? <Tag color="orange">{t('admin_dash_pending_approval')} {data.quotes.pending}</Tag> : null },
    { title: t('admin_dash_orders'), value: data?.orders.total || 0, icon: <DollarOutlined />, color: '#13c2c2', extra: <span>¥{(data?.orders.total_amount || 0).toLocaleString()}</span> },
    { title: t('admin_dash_contracts'), value: data?.contracts.total || 0, icon: <ContainerOutlined />, color: '#eb2f96', extra: data?.contracts.expired ? <Tag color="red">{t('admin_dash_expired')} {data.contracts.expired}</Tag> : null },
    { title: t('admin_dash_tasks'), value: data?.tasks.total || 0, icon: <CheckSquareOutlined />, color: '#fa8c16', extra: data?.tasks.overdue ? <Tag color="red">{t('admin_dash_overdue')} {data.tasks.overdue}</Tag> : null },
    { title: t('admin_dash_logs'), value: data?.logs.total || 0, icon: <HistoryOutlined />, color: '#2f54eb', extra: <Tag color="blue">{t('admin_dash_today')} {data?.logs.today || 0}</Tag> },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}><DatabaseOutlined style={{ fontSize: 18 }} /><span style={{ fontWeight: 500 }}>{t('admin_overview')}</span></Space>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {cards.map((c, i) => (
          <Col span={6} key={i}>
            <Card size="small" loading={loading}>
              <Statistic title={c.title} value={c.value} prefix={<span style={{ color: c.color }}>{c.icon}</span>} />
              {c.extra && <div style={{ marginTop: 8 }}>{c.extra}</div>}
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card title={t('admin_dash_login_trend')} size="small" loading={loading}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data?.loginTrend || []}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis />
                <Tooltip /><Line type="monotone" dataKey="count" stroke="#1890ff" name={t('admin_dash_login_count')} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={8}>
          <Card title={t('admin_dash_system_info')} size="small" loading={loading}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t('admin_dash_db_size')}</span><Tag color="blue">{formatBytes(data?.dbSize || 0)}</Tag></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t('admin_dash_today_ops')}</span><Tag color="green">{data?.logs.today || 0}</Tag></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t('admin_dash_pending_quotes')}</span><Tag color={data?.quotes.pending ? 'orange' : 'default'}>{data?.quotes.pending || 0}</Tag></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t('admin_dash_overdue_tasks')}</span><Tag color={data?.tasks.overdue ? 'red' : 'default'}>{data?.tasks.overdue || 0}</Tag></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t('admin_dash_expired_contracts')}</span><Tag color={data?.contracts.expired ? 'red' : 'default'}>{data?.contracts.expired || 0}</Tag></div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboard;
