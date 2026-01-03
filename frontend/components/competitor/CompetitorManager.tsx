import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, App, Card, Descriptions, Drawer, Row, Col, Statistic, Popconfirm, Select, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, SearchOutlined, ReloadOutlined, BarChartOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, Legend } from 'recharts';
import { competitorService } from '../../services/competitorService';
import { Competitor, CompetitorStats } from '../../types/contracts';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const PIE_COLORS = ['#ff4d4f', '#faad14', '#52c41a'];

const CompetitorManager: React.FC = () => {
  const { message } = App.useApp();
  const { user } = useAuth();
  const { t } = useLanguage();
  const THREAT_MAP: Record<string, { label: string; color: string }> = {
    high: { label: t('competitor_high_threat'), color: '#ff4d4f' }, medium: { label: t('competitor_medium_threat'), color: '#faad14' }, low: { label: t('competitor_low_threat'), color: '#52c41a' }
  };
  const isManager = user?.role === 'sales_manager' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [stats, setStats] = useState<CompetitorStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [compareVisible, setCompareVisible] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<Competitor | null>(null);
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [opportunities, setOpportunities] = useState<{ id: string; name: string; threat_level: string; customer_name: string; amount: number }[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [list, statsData] = await Promise.all([competitorService.getAll(), competitorService.getStats()]);
      setCompetitors(list); setStats(statsData);
    } catch { message.error(t('competitor_load_failed')); }
    finally { setLoading(false); setSelectedRowKeys([]); }
  }, [message, t]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredCompetitors = useMemo(() => competitors.filter(c => !searchText || c.name.toLowerCase().includes(searchText.toLowerCase())), [competitors, searchText]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (editingCompetitor) { await competitorService.update(editingCompetitor.id, values); message.success(t('msg_update_success')); }
      else { await competitorService.create(values); message.success(t('success')); }
      setModalVisible(false); form.resetFields(); setEditingCompetitor(null); loadData();
    } catch { message.error(t('msg_operation_error')); }
  };

  const handleDelete = async (id: string) => {
    try { await competitorService.delete(id); message.success(t('msg_delete_success')); loadData(); } catch { message.error(t('msg_delete_error')); }
  };

  const handleBatchDelete = async () => {
    if (!selectedRowKeys.length) return;
    try { const result = await competitorService.batchDelete(selectedRowKeys as string[]); message.success(t('msg_batch_delete_success').replace('{count}', String(result.deleted))); loadData(); }
    catch { message.error(t('msg_operation_error')); }
  };

  const openEdit = (competitor: Competitor) => {
    setEditingCompetitor(competitor);
    setModalVisible(true);
    setTimeout(() => form.setFieldsValue(competitor), 0);
  };

  const openDetail = async (competitor: Competitor) => {
    setSelectedCompetitor(competitor);
    setDrawerVisible(true);
    try { const opps = await competitorService.getOpportunities(competitor.id); setOpportunities(opps); } catch { setOpportunities([]); }
  };

  const pieData = stats ? [{ name: '高威胁', value: stats.highThreat }, { name: '中威胁', value: stats.mediumThreat }, { name: '低威胁', value: stats.lowThreat }].filter(d => d.value > 0) : [];
  const barData = stats?.topCompetitors || [];
  const compareCompetitors = useMemo(() => competitors.filter(c => compareIds.includes(c.id)), [competitors, compareIds]);

  const columns = [
    { title: t('competitor_name'), dataIndex: 'name', key: 'name', sorter: (a: Competitor, b: Competitor) => a.name.localeCompare(b.name),
      render: (text: string, record: Competitor) => <a onClick={() => openDetail(record)}>{text}</a> },
    { title: t('competitor_website'), dataIndex: 'website', key: 'website', ellipsis: true, render: (url: string) => url ? <a href={url} target="_blank" rel="noopener noreferrer">{url}</a> : '-' },
    { title: t('competitor_related_opps'), dataIndex: 'opportunity_count', key: 'opportunity_count', sorter: (a: Competitor, b: Competitor) => (a.opportunity_count || 0) - (b.opportunity_count || 0),
      render: (v: number) => <Tag color={v > 5 ? 'red' : v > 2 ? 'orange' : 'default'}>{v || 0}</Tag> },
    { title: t('competitor_description'), dataIndex: 'description', key: 'description', ellipsis: true },
    { title: t('actions'), key: 'action', width: 150, render: (_: unknown, record: Competitor) => (
      <Space size="small">
        <Tooltip title={t('details')}><Button type="text" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)} /></Tooltip>
        {isManager && <Tooltip title={t('edit')}><Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} /></Tooltip>}
        {isAdmin && <Popconfirm title={t('msg_confirm_delete')} onConfirm={() => handleDelete(record.id)}><Button type="text" size="small" danger icon={<DeleteOutlined />} /></Popconfirm>}
      </Space>
    )}
  ];

  const rowSelection = isAdmin ? { selectedRowKeys, onChange: (keys: React.Key[]) => setSelectedRowKeys(keys) } : undefined;

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}><Card size="small"><Statistic title={t('competitor_total')} value={stats?.total || 0} styles={{ content: { color: '#1890ff' } }} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title={t('competitor_high_threat')} value={stats?.highThreat || 0} styles={{ content: { color: '#ff4d4f' } }} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title={t('competitor_medium_threat')} value={stats?.mediumThreat || 0} styles={{ content: { color: '#faad14' } }} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title={t('competitor_low_threat')} value={stats?.lowThreat || 0} styles={{ content: { color: '#52c41a' } }} /></Card></Col>
        <Col span={8}><Card size="small"><Statistic title={t('competitor_related_opps')} value={stats?.totalOpportunities || 0} styles={{ content: { color: '#722ed1' } }} /></Card></Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card size="small" title={t('competitor_threat_dist')}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie><Legend /><RTooltip /></PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title={t('competitor_heat_top5')}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} layout="vertical"><XAxis type="number" /><YAxis type="category" dataKey="name" width={80} />
                <RTooltip /><Bar dataKey="count" fill="#1890ff" name={t('competitor_related_opps')} /></BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input placeholder={t('competitor_search')} prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} style={{ width: 200 }} allowClear />
          <Button icon={<ReloadOutlined />} onClick={loadData}>{t('refresh')}</Button>
          {isManager && <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingCompetitor(null); form.resetFields(); setModalVisible(true); }}>{t('competitor_add')}</Button>}
          <Button icon={<BarChartOutlined />} onClick={() => setCompareVisible(true)} disabled={competitors.length < 2}>{t('competitor_compare')}</Button>
          {isAdmin && selectedRowKeys.length > 0 && (
            <Popconfirm title={`${t('delete')} ${selectedRowKeys.length}?`} onConfirm={handleBatchDelete}>
              <Button danger icon={<DeleteOutlined />}>{t('delete')} ({selectedRowKeys.length})</Button>
            </Popconfirm>
          )}
        </Space>
      </Card>

      <Table columns={columns} dataSource={filteredCompetitors} rowKey="id" loading={loading} rowSelection={rowSelection} size="small"
        pagination={{ showSizeChanger: true, showQuickJumper: true, showTotal: total => `${t('all')} ${total}` }} />

      <Drawer title={t('competitor_detail')} open={drawerVisible} onClose={() => setDrawerVisible(false)} size="large">
        {selectedCompetitor && (<>
          <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label={t('competitor_name')}>{selectedCompetitor.name}</Descriptions.Item>
            <Descriptions.Item label={t('competitor_website')}>{selectedCompetitor.website ? <a href={selectedCompetitor.website} target="_blank" rel="noopener noreferrer">{selectedCompetitor.website}</a> : '-'}</Descriptions.Item>
            <Descriptions.Item label={t('competitor_description')}>{selectedCompetitor.description || '-'}</Descriptions.Item>
            <Descriptions.Item label={t('competitor_strengths')}><div style={{ whiteSpace: 'pre-wrap', color: '#52c41a' }}>{selectedCompetitor.strengths || '-'}</div></Descriptions.Item>
            <Descriptions.Item label={t('competitor_weaknesses')}><div style={{ whiteSpace: 'pre-wrap', color: '#ff4d4f' }}>{selectedCompetitor.weaknesses || '-'}</div></Descriptions.Item>
          </Descriptions>
          <Card size="small" title={`${t('competitor_related_opps')} (${opportunities.length})`}>
            <Table size="small" dataSource={opportunities} rowKey="id" pagination={false} columns={[
              { title: t('competitor_opp_name'), dataIndex: 'name', key: 'name' },
              { title: t('competitor_customer'), dataIndex: 'customer_name', key: 'customer_name' },
              { title: t('competitor_amount'), dataIndex: 'amount', key: 'amount', render: (v: number) => `¥${(v || 0).toLocaleString()}` },
              { title: t('competitor_threat_level'), dataIndex: 'threat_level', key: 'threat_level', render: (v: string) => <Tag color={THREAT_MAP[v]?.color}>{THREAT_MAP[v]?.label || v}</Tag> }
            ]} />
          </Card>
        </>)}
      </Drawer>

      <Modal title={editingCompetitor ? t('competitor_edit') : t('competitor_add')} open={modalVisible} onCancel={() => { setModalVisible(false); setEditingCompetitor(null); }} onOk={() => form.submit()} width={600} forceRender>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label={t('competitor_name')} rules={[{ required: true, message: t('msg_input_hint') }]}><Input /></Form.Item>
          <Form.Item name="website" label={t('competitor_website')}><Input placeholder="https://" /></Form.Item>
          <Form.Item name="description" label={t('competitor_description')}><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="strengths" label={t('competitor_strengths')}><Input.TextArea rows={2} placeholder={t('competitor_strengths')} /></Form.Item>
          <Form.Item name="weaknesses" label={t('competitor_weaknesses')}><Input.TextArea rows={2} placeholder={t('competitor_weaknesses')} /></Form.Item>
        </Form>
      </Modal>

      <Modal title={t('competitor_compare')} open={compareVisible} onCancel={() => setCompareVisible(false)} footer={null} width={900}>
        <Select mode="multiple" placeholder={t('competitor_select_compare')} value={compareIds} onChange={v => setCompareIds(v.slice(0, 4))} style={{ width: '100%', marginBottom: 16 }}
          options={competitors.map(c => ({ value: c.id, label: c.name }))} />
        {compareCompetitors.length > 0 && (
          <Table size="small" dataSource={[
            { key: 'name', label: t('competitor_name'), ...Object.fromEntries(compareCompetitors.map(c => [c.id, c.name])) },
            { key: 'website', label: t('competitor_website'), ...Object.fromEntries(compareCompetitors.map(c => [c.id, c.website || '-'])) },
            { key: 'strengths', label: t('competitor_strengths'), ...Object.fromEntries(compareCompetitors.map(c => [c.id, c.strengths || '-'])) },
            { key: 'weaknesses', label: t('competitor_weaknesses'), ...Object.fromEntries(compareCompetitors.map(c => [c.id, c.weaknesses || '-'])) },
          ]} pagination={false} columns={[
            { title: t('competitor_attribute'), dataIndex: 'label', key: 'label', width: 80, fixed: 'left' },
            ...compareCompetitors.map(c => ({ title: c.name, dataIndex: c.id, key: c.id, render: (v: string) => <div style={{ whiteSpace: 'pre-wrap', maxHeight: 100, overflow: 'auto' }}>{v}</div> }))
          ]} />
        )}
      </Modal>
    </div>
  );
};

export default CompetitorManager;
