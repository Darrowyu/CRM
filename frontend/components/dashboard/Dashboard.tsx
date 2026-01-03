import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Typography, Spin, App, Progress, Tag, Table, Tooltip } from 'antd';
import { DollarOutlined, UserAddOutlined, ThunderboltOutlined, FileTextOutlined, CheckSquareOutlined, AimOutlined, ArrowUpOutlined, ArrowDownOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer, Legend } from 'recharts';
import { dashboardService, DashboardStats, FunnelStats, SalesTrend, ConversionStats, TaskItem, FollowUpItem, ContractItem, RankingItem } from '../../services/dashboardService';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const { Title, Text } = Typography;
const STAGE_COLORS: Record<string, string> = { prospecting: '#1890ff', qualification: '#13c2c2', proposal: '#52c41a', negotiation: '#faad14', closed_won: '#52c41a' };
const PRIORITY_COLORS: Record<string, string> = { high: 'red', medium: 'orange', low: 'blue' };

const Dashboard: React.FC = () => {
  const { message } = App.useApp();
  const { user } = useAuth();
  const { t } = useLanguage();
  const isManager = user?.role === 'admin' || user?.role === 'sales_manager';
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [funnelData, setFunnelData] = useState<FunnelStats[]>([]);
  const [trendData, setTrendData] = useState<SalesTrend[]>([]);
  const [conversionData, setConversionData] = useState<ConversionStats[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [ranking, setRanking] = useState<RankingItem[]>([]);

  const STAGE_NAMES: Record<string, string> = {
    prospecting: t('stage_prospecting'),
    qualification: t('stage_qualification'),
    proposal: t('stage_proposal'),
    negotiation: t('stage_negotiation'),
    closed_won: t('stage_closed_won')
  };

  const TYPE_NAMES: Record<string, string> = {
    call: t('task_type_call'),
    visit: t('task_type_visit'),
    email: t('task_type_email'),
    meeting: t('task_type_meeting'),
    other: t('task_type_other')
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, f, tr, c, tk, fu, ct, rk] = await Promise.all([
        dashboardService.getStats(), dashboardService.getFunnelStats(), dashboardService.getSalesTrend(),
        dashboardService.getConversionBySource(), dashboardService.getPendingTasks(), dashboardService.getRecentFollowUps(),
        dashboardService.getExpiringContracts(), isManager ? dashboardService.getSalesRanking() : Promise.resolve([])
      ]);
      setStats(s); setFunnelData(f); setTrendData(tr); setConversionData(c); setTasks(tk); setFollowUps(fu); setContracts(ct); setRanking(rk);
    } catch { message.error(t('dash_load_error')); }
    finally { setLoading(false); }
  }, [message, isManager, t]);

  useEffect(() => { loadData(); }, [loadData]);

  const salesChange = stats && stats.lastMonthSales > 0 ? Math.round(((stats.monthlySales - stats.lastMonthSales) / stats.lastMonthSales) * 100) : 0;
  const pieData = funnelData.filter(f => f.stage !== 'closed_lost').map(f => ({ name: STAGE_NAMES[f.stage] || f.stage, value: f.count, fill: STAGE_COLORS[f.stage] || '#8c8c8c' }));

  const kpiData = [
    { label: t('dash_monthly_sales'), value: stats ? `¥${stats.monthlySales.toLocaleString()}` : '-', icon: <DollarOutlined />, color: '#52c41a', bg: '#f6ffed', suffix: salesChange !== 0 ? <Text type={salesChange > 0 ? 'success' : 'danger'} style={{ fontSize: 12 }}>{salesChange > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}{Math.abs(salesChange)}%</Text> : null },
    { label: t('dash_monthly_payments'), value: stats ? `¥${stats.monthlyPayments.toLocaleString()}` : '-', icon: <DollarOutlined />, color: '#1890ff', bg: '#e6f7ff' },
    { label: t('dash_new_customers'), value: stats ? `+${stats.newCustomers}` : '-', icon: <UserAddOutlined />, color: '#722ed1', bg: '#f9f0ff' },
    { label: t('dash_active_opportunities'), value: stats?.activeOpportunities || 0, icon: <ThunderboltOutlined />, color: '#fa8c16', bg: '#fff7e6' },
    { label: t('dash_pending_tasks'), value: stats?.pendingTasks || 0, icon: <CheckSquareOutlined />, color: '#13c2c2', bg: '#e6fffb', suffix: stats?.overdueTasks ? <Text type="danger" style={{ fontSize: 12 }}><WarningOutlined /> {stats.overdueTasks}{t('dash_overdue')}</Text> : null },
    { label: t('dash_target_progress'), value: `${stats?.targetRate || 0}%`, icon: <AimOutlined />, color: '#eb2f96', bg: '#fff0f6', extra: <Progress percent={stats?.targetRate || 0} size="small" showInfo={false} strokeColor="#eb2f96" /> },
  ];

  return (
    <Spin spinning={loading}>
      <div style={{ padding: '0 0 24px' }}>
        {/* KPI卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {kpiData.map((stat, idx) => (
            <Col xs={24} sm={12} lg={4} key={idx}>
              <Card size="small" styles={{ body: { padding: 16 } }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ background: stat.bg, padding: 10, borderRadius: 8, color: stat.color, fontSize: 20 }}>{stat.icon}</div>
                  <div style={{ flex: 1 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{stat.label}</Text>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <Text strong style={{ fontSize: 18 }}>{stat.value}</Text>
                      {stat.suffix}
                    </div>
                    {stat.extra}
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* 图表区域 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={12}>
            <Card title={<Title level={5} style={{ margin: 0 }}>{t('dash_sales_trend')}</Title>} size="small">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1890ff" stopOpacity={0.8} /><stop offset="95%" stopColor="#1890ff" stopOpacity={0} /></linearGradient>
                    <linearGradient id="colorPayments" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#52c41a" stopOpacity={0.8} /><stop offset="95%" stopColor="#52c41a" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8c8c8c', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8c8c8c', fontSize: 12 }} tickFormatter={v => `¥${(v / 10000).toFixed(0)}W`} />
                  <RTooltip formatter={(v: number) => `¥${v.toLocaleString()}`} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
                  <Legend />
                  <Area type="monotone" dataKey="sales" name={t('dash_sales_amount')} stroke="#1890ff" fillOpacity={1} fill="url(#colorSales)" />
                  <Area type="monotone" dataKey="payments" name={t('dash_monthly_payments')} stroke="#52c41a" fillOpacity={1} fill="url(#colorPayments)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title={<Title level={5} style={{ margin: 0 }}>{t('dash_opportunity_funnel')}</Title>} size="small">
              <div style={{ display: 'flex', alignItems: 'center', height: 280 }}>
                <PieChart width={200} height={260}>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                  </Pie>
                  <RTooltip />
                </PieChart>
                <div style={{ flex: 1, fontSize: 12 }}>
                  {pieData.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: item.fill }}></span>
                      <span style={{ flex: 1 }}>{item.name}</span>
                      <span style={{ fontWeight: 500 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={12}>
            <Card title={<Title level={5} style={{ margin: 0 }}>{t('dash_source_conversion')}</Title>} size="small">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={conversionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#8c8c8c', fontSize: 12 }} />
                  <YAxis type="category" dataKey="source" axisLine={false} tickLine={false} tick={{ fill: '#8c8c8c', fontSize: 12 }} width={80} />
                  <RTooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
                  <Legend />
                  <Bar dataKey="total" name={t('all')} fill="#1890ff" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="converted" name={t('success')} fill="#52c41a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title={<Title level={5} style={{ margin: 0 }}>{isManager ? t('dash_sales_ranking') : t('dash_expiring_contracts')}</Title>} size="small" styles={{ body: { padding: '12px 0' } }}>
              {isManager ? (
                <Table dataSource={ranking} rowKey="user_id" pagination={false} size="small" scroll={{ y: 240 }}
                  columns={[
                    { title: t('dash_rank'), key: 'rank', width: 60, render: (_, __, i) => <Tag color={i < 3 ? ['gold', 'silver', '#cd7f32'][i] : 'default'}>{i + 1}</Tag> },
                    { title: t('dash_sales_rep'), dataIndex: 'user_name', width: 100 },
                    { title: t('dash_sales_amount'), dataIndex: 'sales', render: v => `¥${v.toLocaleString()}` },
                    { title: t('dash_new_clients'), dataIndex: 'customers', width: 80 },
                  ]} />
              ) : (
                <Table dataSource={contracts} rowKey="id" pagination={false} size="small" scroll={{ y: 240 }} locale={{ emptyText: t('dash_no_expiring_contracts') }}
                  columns={[
                    { title: t('contract_title'), dataIndex: 'contract_no', width: 120 },
                    { title: t('cust_company'), dataIndex: 'customer_name', ellipsis: true },
                    { title: t('order_amount'), dataIndex: 'amount', width: 100, render: v => `¥${v?.toLocaleString() || 0}` },
                    { title: t('deal_close_date'), dataIndex: 'end_date', width: 100, render: v => <Text type="danger">{new Date(v).toLocaleDateString()}</Text> },
                  ]} />
              )}
            </Card>
          </Col>
        </Row>

        {/* 底部列表区域 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title={<Title level={5} style={{ margin: 0 }}><CheckSquareOutlined style={{ marginRight: 8 }} />{t('dash_pending_tasks')}</Title>} size="small" styles={{ body: { padding: '12px 0' } }}>
              <Table dataSource={tasks} rowKey="id" pagination={false} size="small" scroll={{ y: 260 }} locale={{ emptyText: t('dash_no_pending_tasks') }}
                columns={[
                  { title: t('dash_priority'), dataIndex: 'priority', width: 70, render: v => <Tag color={PRIORITY_COLORS[v] || 'default'}>{v === 'high' ? t('task_priority_high') : v === 'medium' ? t('task_priority_medium') : t('task_priority_low')}</Tag> },
                  { title: t('dash_task'), dataIndex: 'title', ellipsis: true, render: (v, r) => <><Text ellipsis>{v}</Text>{r.customer_name && <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{r.customer_name}</Text>}</> },
                  { title: t('dash_type'), dataIndex: 'type', width: 70, render: v => <Tag color="blue">{TYPE_NAMES[v] || v}</Tag> },
                  { title: t('deal_close_date'), dataIndex: 'due_date', width: 110, render: v => { const isOverdue = v && new Date(v) < new Date(); return v ? <Text type={isOverdue ? 'danger' : 'secondary'}><ClockCircleOutlined style={{ marginRight: 4 }} />{new Date(v).toLocaleDateString()}</Text> : '-'; } },
                ]} />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title={<Title level={5} style={{ margin: 0 }}><FileTextOutlined style={{ marginRight: 8 }} />{t('dash_recent_followups')}</Title>} size="small" styles={{ body: { padding: '12px 0' } }}>
              <Table dataSource={followUps} rowKey="id" pagination={false} size="small" scroll={{ y: 260 }} locale={{ emptyText: t('dash_no_followups') }}
                columns={[
                  { title: t('dash_type'), dataIndex: 'type', width: 70, render: v => <Tag color="blue">{TYPE_NAMES[v] || v}</Tag> },
                  { title: t('cust_company'), dataIndex: 'customer_name', width: 120, ellipsis: true },
                  { title: t('dash_content'), dataIndex: 'content', ellipsis: true, render: v => <Tooltip title={v}><Text ellipsis type="secondary">{v}</Text></Tooltip> },
                  { title: t('cust_owner'), dataIndex: 'user_name', width: 80 },
                  { title: t('cust_created'), dataIndex: 'created_at', width: 100, render: v => <Text type="secondary" style={{ fontSize: 12 }}>{new Date(v).toLocaleDateString()}</Text> },
                ]} />
            </Card>
          </Col>
        </Row>
      </div>
    </Spin>
  );
};

export default Dashboard;
