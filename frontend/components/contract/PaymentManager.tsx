import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Button, Tag, Space, Modal, Form, InputNumber, DatePicker, App, Card, Row, Col, Statistic, Progress, Input, Select, Drawer, Descriptions, Popconfirm, Alert, Tooltip } from 'antd';
import { PlusOutlined, DollarOutlined, WarningOutlined, EditOutlined, DeleteOutlined, EyeOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { paymentService } from '../../services/paymentService';
import { customerService } from '../../services/customerService';
import { PaymentPlan, PaymentStats } from '../../types/contracts';
import { useLanguage } from '../../contexts/LanguageContext';

const PaymentManager: React.FC = () => {
  const { message } = App.useApp();
  const { t } = useLanguage();
  const STATUS_MAP: Record<string, { label: string; color: string }> = {
    pending: { label: t('payment_status_pending'), color: 'default' }, partial: { label: t('payment_status_partial'), color: 'processing' },
    completed: { label: t('payment_status_completed'), color: 'success' }, overdue: { label: t('payment_status_overdue'), color: 'error' }
  };
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [overduePlans, setOverduePlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [recordModalVisible, setRecordModalVisible] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [editingPlan, setEditingPlan] = useState<PaymentPlan | null>(null);
  const [customers, setCustomers] = useState<{ id: string; company_name: string }[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [form] = Form.useForm();
  const [recordForm] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [list, statsData, overdue] = await Promise.all([paymentService.getAll(), paymentService.getStats(), paymentService.getOverdue()]);
      setPlans(list);
      setStats(statsData);
      setOverduePlans(overdue);
    } catch { message.error(t('payment_load_failed')); }
    finally { setLoading(false); setSelectedRowKeys([]); }
  }, [message, t]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadCustomers = async () => {
    try { const custs = await customerService.getPrivatePool(); setCustomers(custs); } catch { /* ignore */ }
  };

  const filteredPlans = useMemo(() => plans.filter(p => {
    const matchSearch = !searchText || p.customer_name?.toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = !statusFilter || p.status === statusFilter || (statusFilter === 'overdue' && p.status !== 'completed' && dayjs(p.plan_date).isBefore(dayjs()));
    return matchSearch && matchStatus;
  }), [plans, searchText, statusFilter]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const data = { ...values, plan_date: (values.plan_date as dayjs.Dayjs).format('YYYY-MM-DD') };
      if (editingPlan) { await paymentService.update(editingPlan.id, data); message.success(t('payment_plan_updated')); }
      else { await paymentService.create(data); message.success(t('payment_plan_created')); }
      setModalVisible(false); form.resetFields(); setEditingPlan(null); loadData();
    } catch { message.error(t('msg_operation_error')); }
  };

  const handleRecord = async (values: { amount: number; date?: dayjs.Dayjs }) => {
    if (!selectedPlan) return;
    try {
      await paymentService.recordPayment(selectedPlan.id, values.amount, values.date?.format('YYYY-MM-DD'));
      message.success(t('payment_recorded'));
      setRecordModalVisible(false); recordForm.resetFields(); setSelectedPlan(null); loadData();
    } catch { message.error(t('payment_record_failed')); }
  };

  const handleDelete = async (id: string) => {
    try { await paymentService.delete(id); message.success(t('msg_delete_success')); loadData(); } catch { message.error(t('msg_delete_error')); }
  };

  const handleBatchDelete = async () => {
    if (!selectedRowKeys.length) return;
    try { const result = await paymentService.batchDelete(selectedRowKeys as string[]); message.success(t('msg_batch_delete_success').replace('{count}', String(result.deleted))); loadData(); }
    catch { message.error(t('msg_operation_error')); }
  };

  const openRecordModal = (plan: PaymentPlan) => {
    setSelectedPlan(plan);
    setRecordModalVisible(true);
    setTimeout(() => recordForm.setFieldsValue({ amount: plan.plan_amount - plan.actual_amount, date: dayjs() }), 0);
  };

  const openEdit = (plan: PaymentPlan) => {
    setEditingPlan(plan);
    setModalVisible(true);
    loadCustomers();
    setTimeout(() => form.setFieldsValue({ ...plan, plan_date: plan.plan_date ? dayjs(plan.plan_date) : undefined }), 0);
  };

  const openDetail = (plan: PaymentPlan) => { setSelectedPlan(plan); setDetailOpen(true); };

  const isOverdue = (plan: PaymentPlan) => plan.status !== 'completed' && dayjs(plan.plan_date).isBefore(dayjs()); // 判断是否逾期

  const columns = [
    { title: t('payment_customer'), dataIndex: 'customer_name', key: 'customer_name', ellipsis: true },
    { title: t('payment_plan_amount'), dataIndex: 'plan_amount', key: 'plan_amount', sorter: (a: PaymentPlan, b: PaymentPlan) => a.plan_amount - b.plan_amount,
      render: (v: number) => <span style={{ fontWeight: 600 }}>¥{v?.toLocaleString()}</span> },
    { title: t('payment_actual_amount'), dataIndex: 'actual_amount', key: 'actual_amount', sorter: (a: PaymentPlan, b: PaymentPlan) => a.actual_amount - b.actual_amount,
      render: (v: number) => <span style={{ color: '#52c41a' }}>¥{(v || 0).toLocaleString()}</span> },
    { title: t('payment_progress'), key: 'progress', width: 150, render: (_: unknown, r: PaymentPlan) => {
      const pct = r.plan_amount > 0 ? Math.round((r.actual_amount || 0) / r.plan_amount * 100) : 0;
      return <Progress percent={pct} size="small" status={pct >= 100 ? 'success' : isOverdue(r) ? 'exception' : 'active'} />;
    }},
    { title: t('payment_plan_date'), dataIndex: 'plan_date', key: 'plan_date', sorter: (a: PaymentPlan, b: PaymentPlan) => dayjs(a.plan_date).unix() - dayjs(b.plan_date).unix(),
      render: (v: string, r: PaymentPlan) => <span style={{ color: isOverdue(r) ? '#ff4d4f' : undefined, fontWeight: isOverdue(r) ? 600 : undefined }}>{dayjs(v).format('YYYY-MM-DD')}</span> },
    { title: t('payment_status'), dataIndex: 'status', key: 'status', render: (v: string, r: PaymentPlan) => {
      const st = isOverdue(r) ? STATUS_MAP.overdue : STATUS_MAP[v] || STATUS_MAP.pending;
      return <Tag color={st.color}>{st.label}</Tag>;
    }},
    { title: t('actions'), key: 'action', width: 200, render: (_: unknown, r: PaymentPlan) => (
      <Space size="small">
        <Tooltip title={t('details')}><Button type="text" size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)} /></Tooltip>
        <Tooltip title={t('payment_record')}><Button type="text" size="small" icon={<DollarOutlined />} onClick={() => openRecordModal(r)} disabled={r.status === 'completed'} /></Tooltip>
        <Tooltip title={t('edit')}><Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>
        <Popconfirm title={t('msg_confirm_delete')} onConfirm={() => handleDelete(r.id)}><Button type="text" size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
      </Space>
    )}
  ];

  const rowSelection = { selectedRowKeys, onChange: (keys: React.Key[]) => setSelectedRowKeys(keys) };

  return (
    <div style={{ padding: 24 }}>
      {overduePlans.length > 0 && (
        <Alert type="error" showIcon icon={<WarningOutlined />} style={{ marginBottom: 16 }}
          message={t('payment_overdue_alert').replace('{count}', String(overduePlans.length)).replace('{amount}', stats?.overdue_amount?.toLocaleString() || '0')} />
      )}

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}><Card size="small"><Statistic title={t('payment_plan_total')} value={stats?.total_planned || 0} prefix="¥" styles={{ content: { color: '#1890ff' } }} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title={t('payment_received')} value={stats?.total_received || 0} prefix="¥" styles={{ content: { color: '#52c41a' } }} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title={t('payment_rate')} value={stats?.collection_rate || 0} suffix="%" styles={{ content: { color: '#722ed1' } }} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title={t('payment_month_received')} value={stats?.month_received || 0} prefix="¥" styles={{ content: { color: '#13c2c2' } }} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title={t('payment_pending_count')} value={stats?.pending_count || 0} styles={{ content: { color: '#faad14' } }} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title={t('payment_overdue_count')} value={stats?.overdue_count || 0} styles={{ content: { color: '#ff4d4f' } }} /></Card></Col>
      </Row>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input placeholder={t('payment_customer')} prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} style={{ width: 200 }} allowClear />
          <Select placeholder={t('payment_status')} value={statusFilter || undefined} onChange={v => setStatusFilter(v || '')} style={{ width: 120 }} allowClear
            options={[{ value: 'pending', label: t('payment_status_pending') }, { value: 'partial', label: t('payment_status_partial') }, { value: 'completed', label: t('payment_status_completed') }, { value: 'overdue', label: t('payment_status_overdue') }]} />
          <Button icon={<ReloadOutlined />} onClick={loadData}>{t('refresh')}</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingPlan(null); setModalVisible(true); loadCustomers(); form.resetFields(); }}>{t('payment_new_plan')}</Button>
          {selectedRowKeys.length > 0 && (
            <Popconfirm title={`${t('delete')} ${selectedRowKeys.length}?`} onConfirm={handleBatchDelete}>
              <Button danger icon={<DeleteOutlined />}>{t('delete')} ({selectedRowKeys.length})</Button>
            </Popconfirm>
          )}
        </Space>
      </Card>

      <Table columns={columns} dataSource={filteredPlans} rowKey="id" loading={loading} rowSelection={rowSelection} size="small"
        pagination={{ showSizeChanger: true, showQuickJumper: true, showTotal: total => `${t('all')} ${total}` }}
        rowClassName={r => isOverdue(r) ? 'overdue-row' : ''} />

      <Drawer title={t('payment_detail')} open={detailOpen} onClose={() => setDetailOpen(false)} size="large">
        {selectedPlan && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label={t('payment_customer')}>{selectedPlan.customer_name}</Descriptions.Item>
            <Descriptions.Item label={t('payment_status')}><Tag color={isOverdue(selectedPlan) ? 'error' : STATUS_MAP[selectedPlan.status]?.color}>{isOverdue(selectedPlan) ? t('payment_status_overdue') : STATUS_MAP[selectedPlan.status]?.label}</Tag></Descriptions.Item>
            <Descriptions.Item label={t('payment_plan_amount')}>¥{selectedPlan.plan_amount?.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label={t('payment_actual_amount')}>¥{(selectedPlan.actual_amount || 0).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label={t('payment_plan_date')}>{dayjs(selectedPlan.plan_date).format('YYYY-MM-DD')}</Descriptions.Item>
            <Descriptions.Item label={t('payment_actual_date')}>{selectedPlan.actual_date ? dayjs(selectedPlan.actual_date).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
            <Descriptions.Item label={t('payment_progress')} span={2}><Progress percent={selectedPlan.plan_amount > 0 ? Math.round((selectedPlan.actual_amount || 0) / selectedPlan.plan_amount * 100) : 0} /></Descriptions.Item>
            <Descriptions.Item label={t('field_remark')} span={2}>{selectedPlan.remark || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <Modal title={editingPlan ? t('payment_edit_plan') : t('payment_new_plan')} open={modalVisible} onCancel={() => { setModalVisible(false); setEditingPlan(null); }} onOk={() => form.submit()} forceRender>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="customer_id" label={t('payment_customer')} rules={[{ required: true, message: t('msg_select_hint') }]}>
            <Select placeholder={t('msg_select_hint')} showSearch optionFilterProp="label" options={customers.map(c => ({ value: c.id, label: c.company_name }))} disabled={!!editingPlan} />
          </Form.Item>
          <Form.Item name="order_id" label={t('payment_order_id')} rules={[{ required: true, message: t('msg_input_hint') }]}>
            <Input placeholder={t('payment_order_id')} disabled={!!editingPlan} />
          </Form.Item>
          <Form.Item name="plan_amount" label={t('payment_plan_amount')} rules={[{ required: true, message: t('msg_input_hint') }]}>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} prefix="¥" placeholder={t('payment_plan_amount')} />
          </Form.Item>
          <Form.Item name="plan_date" label={t('payment_plan_date')} rules={[{ required: true, message: t('msg_select_hint') }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label={t('field_remark')}><Input.TextArea rows={2} placeholder={t('field_remark')} /></Form.Item>
        </Form>
      </Modal>

      <Modal title={t('payment_record')} open={recordModalVisible} onCancel={() => { setRecordModalVisible(false); setSelectedPlan(null); }} onOk={() => recordForm.submit()} forceRender>
        <Form form={recordForm} layout="vertical" onFinish={handleRecord}>
          {selectedPlan && <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <div>{t('payment_plan_amount')}: <b>¥{selectedPlan.plan_amount?.toLocaleString()}</b></div>
            <div>{t('payment_actual_amount')}: <b>¥{(selectedPlan.actual_amount || 0).toLocaleString()}</b></div>
            <div>{t('payment_remaining')}: <b style={{ color: '#ff4d4f' }}>¥{(selectedPlan.plan_amount - (selectedPlan.actual_amount || 0)).toLocaleString()}</b></div>
          </div>}
          <Form.Item name="amount" label={t('payment_this_amount')} rules={[{ required: true, message: t('msg_input_hint') }]}>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} prefix="¥" />
          </Form.Item>
          <Form.Item name="date" label={t('payment_date')}><DatePicker style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>

      <style>{`.overdue-row { background: #fff2f0 !important; }`}</style>
    </div>
  );
};

export default PaymentManager;
