import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Progress, Statistic, Table, Select, Button, Modal, Form, InputNumber, App, Tabs, Tag } from 'antd';
import { TrophyOutlined, TeamOutlined, UserOutlined, BarChartOutlined, CrownOutlined } from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { targetService } from '../../services/targetService';
import { SalesTarget, TargetWithActuals } from '../../types/tasks';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const SalesTargetPanel: React.FC = () => {
  const { message } = App.useApp();
  const { user } = useAuth();
  const { t } = useLanguage();
  const isManager = user?.role === 'sales_manager' || user?.role === 'admin';
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [myTarget, setMyTarget] = useState<{ target: SalesTarget | null; actuals: { amount: number; customers: number; opportunities: number }; achievement_rate: number } | null>(null);
  const [teamData, setTeamData] = useState<{ target: SalesTarget | null; actuals: { amount: number; customers: number; opportunities: number }; userTargets: TargetWithActuals[]; achievement_rate: number } | null>(null);
  const [yearlyTrend, setYearlyTrend] = useState<{ month: number; target: number; actual: number }[]>([]);
  const [ranking, setRanking] = useState<{ user_id: string; user_name: string; target: number; actual: number; rate: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'user' | 'team'>('user');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [form] = Form.useForm();
  const [batchForm] = Form.useForm();

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [my, trend] = await Promise.all([targetService.getMyTarget(year, month), targetService.getYearlyTrend(year)]);
      setMyTarget(my);
      setYearlyTrend(trend);
      if (isManager) {
        try {
          const [team, rank] = await Promise.all([targetService.getTeamTarget(year, month), targetService.getTeamRanking(year, month)]);
          setTeamData(team);
          setRanking(rank);
        } catch { /* 权限不足时忽略 */ }
      }
    } catch { message.error(t('error')); }
    finally { setLoading(false); }
  }, [year, month, isManager, user, message, t]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSetTarget = async (values: { target_amount: number; target_customers?: number; target_opportunities?: number }) => {
    try {
      if (modalType === 'team') { await targetService.setTeamTarget({ year, month, ...values }); }
      else { await targetService.setUserTarget({ user_id: selectedUserId, year, month, ...values }); }
      message.success(t('success'));
      setModalVisible(false);
      loadData();
    } catch { message.error(t('error')); }
  };

  const handleBatchSet = async (values: { targets: { user_id: string; target_amount: number }[] }) => {
    try {
      await targetService.batchSetTargets(values.targets, year, month);
      message.success(t('success'));
      setBatchModalVisible(false);
      batchForm.resetFields();
      loadData();
    } catch { message.error(t('error')); }
  };

  const openSetModal = (type: 'user' | 'team', userId?: string) => {
    setModalType(type);
    setSelectedUserId(userId || '');
    form.resetFields();
    setModalVisible(true);
  };

  const openBatchModal = () => {
    if (teamData?.userTargets) {
      batchForm.setFieldsValue({ targets: teamData.userTargets.map(tgt => ({ user_id: tgt.user_id, user_name: tgt.user_name, target_amount: tgt.target_amount || 0 })) });
    }
    setBatchModalVisible(true);
  };

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}` }));
  const years = Array.from({ length: 5 }, (_, i) => ({ value: new Date().getFullYear() - 2 + i, label: `${new Date().getFullYear() - 2 + i}` }));

  const getRateColor = (rate: number) => rate >= 100 ? '#52c41a' : rate >= 80 ? '#1890ff' : rate >= 50 ? '#faad14' : '#ff4d4f';

  const userColumns = [
    { title: t('dash_rank'), key: 'rank', width: 60, render: (_: unknown, __: unknown, idx: number) => idx < 3 ? <CrownOutlined style={{ color: ['#ffd700', '#c0c0c0', '#cd7f32'][idx], fontSize: 18 }} /> : idx + 1 },
    { title: t('dash_sales_rep'), dataIndex: 'user_name', key: 'user_name' },
    { title: t('target_title'), dataIndex: 'target_amount', key: 'target_amount', render: (v: number) => `¥${(v || 0).toLocaleString()}`, sorter: (a: TargetWithActuals, b: TargetWithActuals) => (a.target_amount || 0) - (b.target_amount || 0) },
    { title: t('target_actual'), dataIndex: 'actual_amount', key: 'actual_amount', render: (v: number) => `¥${(v || 0).toLocaleString()}`, sorter: (a: TargetWithActuals, b: TargetWithActuals) => (a.actual_amount || 0) - (b.actual_amount || 0) },
    {
      title: t('target_progress'), key: 'rate', sorter: (a: TargetWithActuals, b: TargetWithActuals) => (a.achievement_rate || 0) - (b.achievement_rate || 0), render: (_: unknown, r: TargetWithActuals) => {
        const rate = r.target_amount > 0 ? Math.round((r.actual_amount / r.target_amount) * 100) : 0;
        return <Progress percent={rate} size="small" strokeColor={getRateColor(rate)} />;
      }
    },
    ...(isManager ? [{ title: t('actions'), key: 'action', width: 80, render: (_: unknown, r: TargetWithActuals) => <Button type="link" size="small" onClick={() => openSetModal('user', r.user_id)}>{t('target_set')}</Button> }] : [])
  ];

  const rankingColumns = [
    { title: t('dash_rank'), key: 'rank', width: 60, render: (_: unknown, __: unknown, idx: number) => idx < 3 ? <CrownOutlined style={{ color: ['#ffd700', '#c0c0c0', '#cd7f32'][idx], fontSize: 18 }} /> : idx + 1 },
    { title: t('dash_sales_rep'), dataIndex: 'user_name', key: 'user_name' },
    { title: t('target_progress'), dataIndex: 'rate', key: 'rate', render: (v: number) => <Tag color={getRateColor(v)}>{v}%</Tag> },
    { title: t('target_title'), dataIndex: 'target', key: 'target', render: (v: number) => `¥${(v || 0).toLocaleString()}` },
    { title: t('target_actual'), dataIndex: 'actual', key: 'actual', render: (v: number) => `¥${(v || 0).toLocaleString()}` },
  ];

  return (
    <div>
      {/* 筛选栏 */}
      <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
        <Col><Select value={year} onChange={setYear} options={years} style={{ width: 100 }} /></Col>
        <Col><Select value={month} onChange={setMonth} options={months} style={{ width: 80 }} /></Col>
        {isManager && (
          <>
            <Col><Button type="primary" onClick={() => openSetModal('team')}>{t('target_set')}</Button></Col>
            <Col><Button onClick={openBatchModal}>{t('task_batch_complete')}</Button></Col>
          </>
        )}
      </Row>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title={t('target_title')} value={myTarget?.target?.target_amount || 0} prefix="¥" />
            <Progress percent={myTarget?.achievement_rate || 0} size="small" strokeColor={getRateColor(myTarget?.achievement_rate || 0)} style={{ marginTop: 8 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title={t('target_actual')} value={myTarget?.actuals?.amount || 0} prefix="¥" styles={{ content: { color: '#52c41a' } }} />
            <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>{t('target_progress')}: {myTarget?.achievement_rate || 0}%</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title={t('dash_new_customers')} value={myTarget?.actuals?.customers || 0} suffix={`/ ${myTarget?.target?.target_customers || 0}`} prefix={<UserOutlined />} />
            <Progress percent={myTarget?.target?.target_customers ? Math.round((myTarget.actuals.customers / myTarget.target.target_customers) * 100) : 0} size="small" style={{ marginTop: 8 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title={t('stage_closed_won')} value={myTarget?.actuals?.opportunities || 0} suffix={`/ ${myTarget?.target?.target_opportunities || 0}`} prefix={<TrophyOutlined />} />
            <Progress percent={myTarget?.target?.target_opportunities ? Math.round((myTarget.actuals.opportunities / myTarget.target.target_opportunities) * 100) : 0} size="small" style={{ marginTop: 8 }} />
          </Card>
        </Col>
      </Row>

      {/* 团队统计（经理可见） */}
      {isManager && teamData && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card size="small">
              <Statistic title={t('target_title')} value={teamData.target?.target_amount || 0} prefix={<><TeamOutlined /> ¥</>} />
              <Progress percent={teamData.achievement_rate || 0} size="small" strokeColor={getRateColor(teamData.achievement_rate)} style={{ marginTop: 8 }} />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic title={t('target_actual')} value={teamData.actuals?.amount || 0} prefix="¥" styles={{ content: { color: '#1890ff' } }} />
              <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>{t('target_progress')}: {teamData.achievement_rate || 0}%</div>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic title={t('admin_stats_users')} value={teamData.userTargets?.length || 0} />
              <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>{ranking.filter(r => r.rate >= 100).length} ✓</div>
            </Card>
          </Col>
        </Row>
      )}

      {/* 主内容区 */}
      <Tabs defaultActiveKey="trend" items={[
        {
          key: 'trend', label: <><BarChartOutlined /> {t('dash_sales_trend')}</>, children: (
            <Card loading={loading}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={yearlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={v => `¥${(v / 10000).toFixed(0)}W`} />
                  <Tooltip formatter={(v: number) => `¥${v.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="target" name={t('target_title')} stroke="#1890ff" strokeWidth={2} />
                  <Line type="monotone" dataKey="actual" name={t('target_actual')} stroke="#52c41a" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )
        },
        ...(isManager ? [
          {
            key: 'ranking', label: <><TrophyOutlined /> {t('dash_sales_ranking')}</>, children: (
              <Card loading={loading}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Table columns={rankingColumns} dataSource={ranking} rowKey="user_id" pagination={false} size="small" />
                  </Col>
                  <Col span={12}>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={ranking.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={v => `${v}%`} />
                        <YAxis type="category" dataKey="user_name" width={80} />
                        <Tooltip formatter={(v: number) => `${v}%`} />
                        <Bar dataKey="rate" name={t('target_progress')} fill="#1890ff" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Col>
                </Row>
              </Card>
            )
          },
          {
            key: 'team', label: <><TeamOutlined /> {t('admin_users')}</>, children: (
              <Card loading={loading}>
                <Table columns={userColumns} dataSource={teamData?.userTargets || []} rowKey="user_id" pagination={false} size="small" />
              </Card>
            )
          }
        ] : [])
      ]} />

      {/* 设置目标弹窗 */}
      <Modal title={t('target_set')} open={modalVisible} onCancel={() => setModalVisible(false)} onOk={() => form.submit()} forceRender>
        <Form form={form} layout="vertical" onFinish={handleSetTarget}>
          <Form.Item name="target_amount" label={t('order_amount')} rules={[{ required: true, message: t('required') }]}>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} prefix="¥" />
          </Form.Item>
          <Form.Item name="target_customers" label={t('dash_new_customers')}><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="target_opportunities" label={t('stage_closed_won')}><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
        </Form>
      </Modal>

      {/* 批量设置弹窗 */}
      <Modal title={t('target_set')} open={batchModalVisible} onCancel={() => setBatchModalVisible(false)} onOk={() => batchForm.submit()} width={600} forceRender>
        <Form form={batchForm} layout="vertical" onFinish={handleBatchSet}>
          <Form.List name="targets">
            {(fields) => (
              <Table size="small" pagination={false} dataSource={fields.map((f, i) => ({ ...f, ...batchForm.getFieldValue(['targets', i]) }))} rowKey="key" columns={[
                { title: t('dash_sales_rep'), dataIndex: 'user_name', key: 'user_name' },
                {
                  title: t('order_amount'), key: 'target_amount', render: (_, __, idx) => (
                    <Form.Item name={[idx, 'target_amount']} style={{ marginBottom: 0 }} rules={[{ required: true }]}>
                      <InputNumber min={0} prefix="¥" style={{ width: '100%' }} />
                    </Form.Item>
                  )
                },
              ]} />
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
};

export default SalesTargetPanel;
