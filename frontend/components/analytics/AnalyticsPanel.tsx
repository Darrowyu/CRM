import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Row, Col, Table, Tag, Statistic, Progress, Button, App, Tabs, Space, Alert, Select, Input } from 'antd';
import { TrophyOutlined, RiseOutlined, BarChartOutlined, ReloadOutlined, FunnelPlotOutlined, AlertOutlined, SearchOutlined, CrownOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, FunnelChart, Funnel, LabelList } from 'recharts';
import { scoringService, CustomerScore, ForecastSummary, FunnelData, TrendData, RankingData, AlertData } from '../../services/scoringService';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const GRADE_COLORS: Record<string, string> = { A: '#52c41a', B: '#1890ff', C: '#faad14', D: '#ff4d4f' };
const FUNNEL_COLORS = ['#1890ff', '#13c2c2', '#52c41a', '#faad14', '#722ed1'];

const AnalyticsPanel: React.FC = () => {
  const { message } = App.useApp();
  const { user } = useAuth();
  const { t } = useLanguage();
  const isManager = user?.role === 'sales_manager' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';
  const [scores, setScores] = useState<CustomerScore[]>([]);
  const [distribution, setDistribution] = useState<{ grade: string; count: number }[]>([]);
  const [forecast, setForecast] = useState<ForecastSummary | null>(null);
  const [funnel, setFunnel] = useState<FunnelData[]>([]);
  const [trend, setTrend] = useState<TrendData[]>([]);
  const [ranking, setRanking] = useState<RankingData[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<string>('');
  const [searchText, setSearchText] = useState('');

  // 使用useMemo缓存STAGE_NAMES
  const STAGE_NAMES: Record<string, string> = useMemo(() => ({
    prospecting: t('stage_prospecting'),
    qualification: t('stage_qualification'),
    proposal: t('stage_proposal'),
    negotiation: t('stage_negotiation'),
    closed_won: t('stage_closed_won')
  }), [t]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [scoreList, dist, fc, fn, tr, al] = await Promise.all([
        scoringService.getScores({ limit: 50 }), scoringService.getDistribution(), scoringService.getForecastSummary(),
        scoringService.getFunnel(), scoringService.getTrend(6), scoringService.getAlerts()
      ]);
      setScores(scoreList); setDistribution(dist); setForecast(fc); setFunnel(fn); setTrend(tr); setAlerts(al);
      if (isManager) { const rk = await scoringService.getRanking(); setRanking(rk); }
    } catch { message.error(t('error')); }
    finally { setLoading(false); }
  }, [message, isManager, t]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCalculate = async () => {
    try { const result = await scoringService.calculateScores(); message.success(`${t('success')} (${result.count})`); loadData(); }
    catch { message.error(t('error')); }
  };

  const handleGenerateForecast = async () => {
    try { const now = new Date(); const result = await scoringService.generateForecast(now.getFullYear(), now.getMonth() + 1); message.success(`¥${result.forecast_amount.toLocaleString()}`); loadData(); }
    catch { message.error(t('error')); }
  };

  // 使用useMemo缓存筛选结果
  const filteredScores = useMemo(() => scores.filter(s => (!gradeFilter || s.grade === gradeFilter) && (!searchText || s.company_name?.toLowerCase().includes(searchText.toLowerCase()))), [scores, gradeFilter, searchText]);

  // 使用useMemo缓存表格列定义
  const scoreColumns = useMemo(() => [
    { title: t('cust_company'), dataIndex: 'company_name', key: 'company_name', render: (v: string) => v || '-' },
    { title: t('analytics_grade'), dataIndex: 'grade', key: 'grade', width: 100, render: (g: string) => <Tag color={GRADE_COLORS[g]}>{g}{t('agent_grade_customer')}</Tag> },
    { title: 'R', dataIndex: 'recency_score', key: 'recency_score', width: 60, sorter: (a: CustomerScore, b: CustomerScore) => a.recency_score - b.recency_score },
    { title: 'F', dataIndex: 'frequency_score', key: 'frequency_score', width: 60, sorter: (a: CustomerScore, b: CustomerScore) => a.frequency_score - b.frequency_score },
    { title: 'M', dataIndex: 'monetary_score', key: 'monetary_score', width: 60, sorter: (a: CustomerScore, b: CustomerScore) => a.monetary_score - b.monetary_score },
    {
      title: t('analytics_score'), dataIndex: 'total_score', key: 'total_score', width: 120, sorter: (a: CustomerScore, b: CustomerScore) => a.total_score - b.total_score,
      render: (s: number) => <Progress percent={Math.round((s / 15) * 100)} size="small" strokeColor={s >= 13 ? '#52c41a' : s >= 10 ? '#1890ff' : s >= 7 ? '#faad14' : '#ff4d4f'} />
    }
  ], [t]);

  const rankingColumns = useMemo(() => [
    { title: t('dash_rank'), dataIndex: 'rank', key: 'rank', width: 60, render: (v: number) => v <= 3 ? <CrownOutlined style={{ color: v === 1 ? '#ffd700' : v === 2 ? '#c0c0c0' : '#cd7f32', fontSize: 18 }} /> : v },
    { title: t('dash_sales_rep'), dataIndex: 'user_name', key: 'user_name' },
    { title: t('dash_sales_amount'), dataIndex: 'amount', key: 'amount', render: (v: number) => `¥${v.toLocaleString()}` },
    { title: t('target_title'), dataIndex: 'target', key: 'target', render: (v: number) => `¥${v.toLocaleString()}` },
    { title: t('target_progress'), dataIndex: 'rate', key: 'rate', render: (v: number) => <Progress percent={Math.min(v, 100)} size="small" status={v >= 100 ? 'success' : v >= 80 ? 'active' : 'exception'} /> }
  ], [t]);

  // 使用useMemo缓存图表数据
  const pieData = useMemo(() => distribution.map(d => ({ name: `${d.grade}`, value: d.count, fill: GRADE_COLORS[d.grade] })), [distribution]);
  const funnelData = useMemo(() => funnel.map((f, i) => ({ name: STAGE_NAMES[f.stage] || f.stage, value: f.count, amount: f.amount, rate: f.conversion_rate, fill: FUNNEL_COLORS[i % FUNNEL_COLORS.length] })), [funnel, STAGE_NAMES]);

  return (
    <div style={{ padding: 24 }}>
      {alerts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {alerts.map((a, i) => <Alert key={i} type={a.level === 'error' ? 'error' : 'warning'} message={a.message} showIcon closable style={{ marginBottom: 8 }} />)}
        </div>
      )}

      <Tabs defaultActiveKey="funnel" items={[
        {
          key: 'funnel', label: <span><FunnelPlotOutlined />{t('analytics_funnel')}</span>, children: (
            <Row gutter={16}>
              <Col span={12}>
                <Card title={t('analytics_funnel')} size="small">
                  <ResponsiveContainer width="100%" height={300}>
                    <FunnelChart><Tooltip formatter={(v: number) => v.toLocaleString()} />
                      <Funnel dataKey="value" data={funnelData} isAnimationActive>
                        <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
                        {funnelData.map((_, i) => <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />)}
                      </Funnel>
                    </FunnelChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
              <Col span={12}>
                <Card title={t('details')} size="small">
                  <Table size="small" dataSource={funnel} rowKey="stage" pagination={false} columns={[
                    { title: t('stage_prospecting'), dataIndex: 'stage', key: 'stage', render: (v: string) => STAGE_NAMES[v] || v },
                    { title: t('kpi_active_deals'), dataIndex: 'count', key: 'count' },
                    { title: t('order_amount'), dataIndex: 'amount', key: 'amount', render: (v: number) => `¥${v.toLocaleString()}` },
                    { title: '%', dataIndex: 'conversion_rate', key: 'conversion_rate', render: (v: number) => <Tag color={v >= 80 ? 'green' : v >= 50 ? 'orange' : 'red'}>{v}%</Tag> },
                    { title: t('agent_days'), dataIndex: 'avg_days', key: 'avg_days', render: (v: number) => `${v}` }
                  ]} />
                </Card>
              </Col>
            </Row>
          )
        },
        {
          key: 'trend', label: <span><RiseOutlined />{t('analytics_forecast')}</span>, children: (
            <div>
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}><Card size="small"><Statistic title={t('analytics_forecast')} value={forecast?.total_forecast || 0} prefix="¥" styles={{ content: { color: '#1890ff' } }} /></Card></Col>
                <Col span={8}><Card size="small"><Statistic title={t('target_actual')} value={forecast?.total_actual || 0} prefix="¥" styles={{ content: { color: '#52c41a' } }} /></Card></Col>
                <Col span={8}><Card size="small"><Statistic title="%" value={forecast?.accuracy || 0} suffix="%" styles={{ content: { color: (forecast?.accuracy || 0) >= 80 ? '#52c41a' : '#faad14' } }} /></Card></Col>
              </Row>
              <Card title={t('analytics_forecast')} size="small" extra={<Button type="primary" icon={<BarChartOutlined />} onClick={handleGenerateForecast}>{t('analytics_forecast')}</Button>}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" /><YAxis />
                    <Tooltip formatter={(v: number) => `¥${v.toLocaleString()}`} /><Legend />
                    <Line type="monotone" dataKey="forecast" stroke="#1890ff" name={t('analytics_forecast')} strokeWidth={2} />
                    <Line type="monotone" dataKey="actual" stroke="#52c41a" name={t('target_actual')} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )
        },
        {
          key: 'scoring', label: <span><TrophyOutlined />{t('analytics_customer_score')}</span>, children: (
            <div>
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={12}>
                  <Card title={t('analytics_customer_score')} size="small" extra={isAdmin && <Button icon={<ReloadOutlined />} onClick={handleCalculate} size="small">{t('analytics_calculate')}</Button>}>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                        {pieData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                      </Pie><Tooltip /></PieChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="RFM" size="small">
                    <p><strong>R (Recency)</strong>: {t('analytics_recency')}</p>
                    <p><strong>F (Frequency)</strong>: {t('analytics_frequency')}</p>
                    <p><strong>M (Monetary)</strong>: {t('analytics_monetary')}</p>
                    <div style={{ marginTop: 12 }}><strong>{t('analytics_grade')}:</strong></div>
                    <Space style={{ marginTop: 8 }}><Tag color={GRADE_COLORS.A}>A (13-15)</Tag><Tag color={GRADE_COLORS.B}>B (10-12)</Tag><Tag color={GRADE_COLORS.C}>C (7-9)</Tag><Tag color={GRADE_COLORS.D}>D (3-6)</Tag></Space>
                  </Card>
                </Col>
              </Row>
              <Card title={t('analytics_customer_score')} size="small" extra={
                <Space>
                  <Input placeholder={t('search')} prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} style={{ width: 150 }} allowClear size="small" />
                  <Select placeholder={t('filter')} value={gradeFilter || undefined} onChange={v => setGradeFilter(v || '')} style={{ width: 100 }} allowClear size="small"
                    options={[{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }, { value: 'C', label: 'C' }, { value: 'D', label: 'D' }]} />
                </Space>
              }>
                <Table columns={scoreColumns} dataSource={filteredScores} rowKey="customer_id" loading={loading} size="small" pagination={{ pageSize: 10, showTotal: total => `${t('all')} ${total}` }} />
              </Card>
            </div>
          )
        },
        ...(isManager ? [{
          key: 'ranking', label: <span><CrownOutlined />{t('dash_sales_ranking')}</span>, children: (
            <Row gutter={16}>
              <Col span={12}>
                <Card title={t('dash_sales_ranking')} size="small">
                  <Table columns={rankingColumns} dataSource={ranking} rowKey="user_id" size="small" pagination={false} />
                </Card>
              </Col>
              <Col span={12}>
                <Card title={t('dash_sales_ranking')} size="small">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ranking} layout="vertical"><XAxis type="number" /><YAxis type="category" dataKey="user_name" width={60} />
                      <Tooltip formatter={(v: number) => `¥${v.toLocaleString()}`} /><Legend />
                      <Bar dataKey="amount" fill="#1890ff" name={t('target_actual')} />
                      <Bar dataKey="target" fill="#faad14" name={t('target_title')} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
            </Row>
          )
        }] : []),
        {
          key: 'alerts', label: <span><AlertOutlined />{t('warning')} {alerts.length > 0 && <Tag color="red" style={{ marginLeft: 4 }}>{alerts.length}</Tag>}</span>, children: (
            <Card size="small">
              {alerts.length === 0 ? <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>{t('no_data')}</div> : (
                <Table size="small" dataSource={alerts.map((a, i) => ({ ...a, key: i }))} rowKey="key" pagination={false} columns={[
                  { title: t('dash_type'), dataIndex: 'type', key: 'type', width: 100, render: (v: string) => <Tag>{v}</Tag> },
                  { title: t('warning'), dataIndex: 'level', key: 'level', width: 80, render: (v: string) => <Tag color={v === 'error' ? 'red' : 'orange'}>{v === 'error' ? t('error') : t('warning')}</Tag> },
                  { title: t('details'), dataIndex: 'message', key: 'message' }
                ]} />
              )}
            </Card>
          )
        }
      ]} />
    </div>
  );
};

export default AnalyticsPanel;
