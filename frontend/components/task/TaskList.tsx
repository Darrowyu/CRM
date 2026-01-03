import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, Select, DatePicker, App, Card, Row, Col, Statistic, Tooltip, Drawer, Descriptions, Popconfirm } from 'antd';
import { PlusOutlined, CheckOutlined, ClockCircleOutlined, ExclamationCircleOutlined, DeleteOutlined, EditOutlined, PlayCircleOutlined, PercentageOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { taskService } from '../../services/taskService';
import { Task, TaskStatus, TaskStats } from '../../types/tasks';
import { useAuth } from '../../contexts/AuthContext';
import { customerService } from '../../services/customerService';
import { opportunityService } from '../../services/opportunityService';
import { useLanguage } from '../../contexts/LanguageContext';

const TaskList: React.FC = () => {
  const { message } = App.useApp();
  const { user } = useAuth();
  const { t } = useLanguage();
  const isManager = user?.role === 'sales_manager' || user?.role === 'admin';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [customers, setCustomers] = useState<{ id: string; company_name: string }[]>([]);
  const [opportunities, setOpportunities] = useState<{ id: string; name: string }[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);
  const [form] = Form.useForm();

  const TASK_TYPE_MAP: Record<string, { label: string; color: string }> = {
    follow_up: { label: t('task_type_visit'), color: 'blue' },
    call: { label: t('task_type_call'), color: 'cyan' },
    visit: { label: t('task_type_visit'), color: 'green' },
    meeting: { label: t('task_type_meeting'), color: 'purple' },
    quote: { label: t('nav_quotes'), color: 'orange' },
    other: { label: t('task_type_other'), color: 'default' }
  };

  const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
    low: { label: t('task_priority_low'), color: 'default' },
    medium: { label: t('task_priority_medium'), color: 'blue' },
    high: { label: t('task_priority_high'), color: 'orange' },
    urgent: { label: t('task_priority_urgent'), color: 'red' }
  };

  const STATUS_MAP: Record<string, { label: string; color: string }> = {
    pending: { label: t('task_pending'), color: 'default' },
    in_progress: { label: t('task_in_progress'), color: 'processing' },
    completed: { label: t('task_completed'), color: 'success' },
    cancelled: { label: t('order_status_cancelled'), color: 'default' }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [taskList, taskStats] = await Promise.all([taskService.getAll({ status: statusFilter || undefined }), taskService.getStats()]);
      setTasks(taskList);
      setStats(taskStats);
    } catch { message.error(t('error')); }
    finally { setLoading(false); setSelectedRowKeys([]); }
  }, [statusFilter, message, t]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadFormData = async () => {
    try {
      const custs = await customerService.getPrivatePool();
      setCustomers(custs);
      if (isManager) {
        const members = await taskService.getTeamMembers();
        setTeamMembers(members);
      }
    } catch { /* ignore */ }
  };

  const handleCustomerChange = async (customerId: string) => {
    form.setFieldValue('opportunity_id', undefined);
    if (customerId) {
      try {
        const opps = await opportunityService.getByCustomer(customerId);
        setOpportunities(opps);
      } catch { setOpportunities([]); }
    } else { setOpportunities([]); }
  };

  const filteredTasks = useMemo(() => tasks.filter(task => {
    const matchType = !typeFilter || task.type === typeFilter;
    const matchPriority = !priorityFilter || task.priority === priorityFilter;
    return matchType && matchPriority;
  }), [tasks, typeFilter, priorityFilter]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const data = { ...values, due_date: values.due_date ? (values.due_date as dayjs.Dayjs).toISOString() : undefined };
      if (editingTask) { await taskService.update(editingTask.id, data); message.success(t('success')); }
      else { await taskService.create(data); message.success(t('success')); }
      setModalVisible(false); form.resetFields(); setEditingTask(null); loadData();
    } catch { message.error(t('error')); }
  };

  const handleComplete = async (task: Task) => {
    try { await taskService.update(task.id, { status: TaskStatus.COMPLETED }); message.success(t('success')); loadData(); }
    catch { message.error(t('error')); }
  };

  const handleStart = async (task: Task) => {
    try { await taskService.update(task.id, { status: TaskStatus.IN_PROGRESS }); message.success(t('success')); loadData(); }
    catch { message.error(t('error')); }
  };

  const handleDelete = async (id: string) => {
    try { await taskService.delete(id); message.success(t('success')); loadData(); } catch { message.error(t('error')); }
  };

  const handleBatchComplete = async () => {
    if (!selectedRowKeys.length) return;
    try { await taskService.batchComplete(selectedRowKeys as string[]); message.success(t('success')); loadData(); }
    catch { message.error(t('error')); }
  };

  const handleBatchDelete = async () => {
    if (!selectedRowKeys.length) return;
    try { await taskService.batchDelete(selectedRowKeys as string[]); message.success(t('success')); loadData(); }
    catch { message.error(t('error')); }
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setModalVisible(true);
    loadFormData();
    if (task.customer_id) handleCustomerChange(task.customer_id);
    setTimeout(() => form.setFieldsValue({ ...task, due_date: task.due_date ? dayjs(task.due_date) : undefined }), 0);
  };

  const openDetail = (task: Task) => { setSelectedTask(task); setDetailOpen(true); };

  const isOverdue = (task: Task) => task.due_date && dayjs(task.due_date).isBefore(dayjs()) && !['completed', 'cancelled'].includes(task.status);

  const columns = [
    {
      title: t('dash_task'), dataIndex: 'title', key: 'title', render: (text: string, record: Task) => (
        <Space direction="vertical" size={0}>
          <a onClick={() => openDetail(record)} style={{ fontWeight: 500, color: isOverdue(record) ? '#ff4d4f' : undefined }}>{text}</a>
          {record.customer_name && <span style={{ fontSize: 12, color: '#888' }}>{t('cust_company')}: {record.customer_name}</span>}
        </Space>
      )
    },
    { title: t('dash_type'), dataIndex: 'type', key: 'type', width: 80, render: (type: string) => <Tag color={TASK_TYPE_MAP[type]?.color}>{TASK_TYPE_MAP[type]?.label}</Tag>, filters: Object.entries(TASK_TYPE_MAP).map(([k, v]) => ({ text: v.label, value: k })), onFilter: (v: any, r: Task) => r.type === v },
    { title: t('dash_priority'), dataIndex: 'priority', key: 'priority', width: 80, render: (p: string) => <Tag color={PRIORITY_MAP[p]?.color}>{PRIORITY_MAP[p]?.label}</Tag>, filters: Object.entries(PRIORITY_MAP).map(([k, v]) => ({ text: v.label, value: k })), onFilter: (v: any, r: Task) => r.priority === v },
    { title: t('cust_status'), dataIndex: 'status', key: 'status', width: 90, render: (s: string, r: Task) => <Tag color={isOverdue(r) ? 'error' : STATUS_MAP[s]?.color}>{isOverdue(r) ? t('task_overdue') : STATUS_MAP[s]?.label}</Tag> },
    { title: t('cust_owner'), dataIndex: 'assigned_to_name', key: 'assigned_to_name', width: 90 },
    {
      title: t('dash_due_date'), dataIndex: 'due_date', key: 'due_date', width: 120, sorter: (a: Task, b: Task) => dayjs(a.due_date || '9999').unix() - dayjs(b.due_date || '9999').unix(), render: (d: string, r: Task) => {
        if (!d) return '-';
        return <span style={{ color: isOverdue(r) ? '#ff4d4f' : undefined }}>{dayjs(d).format('MM-DD HH:mm')}</span>;
      }
    },
    {
      title: t('actions'), key: 'action', width: 180, render: (_: unknown, record: Task) => (
        <Space size="small">
          {record.status === 'pending' && <Tooltip title={t('task_start')}><Button type="text" size="small" icon={<PlayCircleOutlined />} onClick={() => handleStart(record)} /></Tooltip>}
          {record.status !== 'completed' && record.status !== 'cancelled' && <Tooltip title={t('task_complete')}><Button type="text" size="small" icon={<CheckOutlined style={{ color: '#52c41a' }} />} onClick={() => handleComplete(record)} /></Tooltip>}
          <Tooltip title={t('edit')}><Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} /></Tooltip>
          <Popconfirm title={t('admin_confirm_delete')} onConfirm={() => handleDelete(record.id)}><Tooltip title={t('delete')}><Button type="text" size="small" danger icon={<DeleteOutlined />} /></Tooltip></Popconfirm>
        </Space>
      )
    }
  ];

  const rowSelection = { selectedRowKeys, onChange: setSelectedRowKeys, getCheckboxProps: (r: Task) => ({ disabled: r.status === 'completed' || r.status === 'cancelled' }) };

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}><Card size="small"><Statistic title={t('task_total')} value={stats?.total || 0} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title={t('task_pending')} value={stats?.pending || 0} prefix={<ClockCircleOutlined />} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title={t('task_in_progress')} value={stats?.in_progress || 0} styles={{ content: { color: '#1890ff' } }} prefix={<PlayCircleOutlined />} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title={t('task_overdue')} value={stats?.overdue || 0} styles={{ content: { color: '#ff4d4f' } }} prefix={<ExclamationCircleOutlined />} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title={t('task_completed')} value={stats?.completed_week || 0} styles={{ content: { color: '#52c41a' } }} prefix={<CheckOutlined />} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title="%" value={stats?.completion_rate || 0} suffix="%" prefix={<PercentageOutlined />} /></Card></Col>
      </Row>

      {/* 筛选和操作栏 */}
      <Card title={t('task_title')} extra={
        <Space>
          <Select value={statusFilter || undefined} onChange={v => setStatusFilter(v || '')} style={{ width: 100 }} placeholder={t('cust_status')} allowClear options={Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))} />
          <Select value={typeFilter || undefined} onChange={v => setTypeFilter(v || '')} style={{ width: 100 }} placeholder={t('dash_type')} allowClear options={Object.entries(TASK_TYPE_MAP).map(([k, v]) => ({ value: k, label: v.label }))} />
          <Select value={priorityFilter || undefined} onChange={v => setPriorityFilter(v || '')} style={{ width: 100 }} placeholder={t('dash_priority')} allowClear options={Object.entries(PRIORITY_MAP).map(([k, v]) => ({ value: k, label: v.label }))} />
          {selectedRowKeys.length > 0 && (
            <>
              <Popconfirm title={`${t('task_batch_complete')} ${selectedRowKeys.length}?`} onConfirm={handleBatchComplete}><Button icon={<CheckOutlined />}>{t('task_batch_complete')} ({selectedRowKeys.length})</Button></Popconfirm>
              <Popconfirm title={`${t('task_batch_delete')} ${selectedRowKeys.length}?`} onConfirm={handleBatchDelete}><Button danger icon={<DeleteOutlined />}>{t('task_batch_delete')}</Button></Popconfirm>
            </>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingTask(null); form.resetFields(); setModalVisible(true); loadFormData(); }}>{t('task_add')}</Button>
        </Space>
      }>
        <Table columns={columns} dataSource={filteredTasks} rowKey="id" loading={loading} pagination={{ pageSize: 10, showSizeChanger: true, showTotal: total => `${t('all')} ${total}` }} rowSelection={rowSelection} size="small" />
      </Card>

      {/* 任务详情抽屉 */}
      <Drawer title={t('details')} open={detailOpen} onClose={() => setDetailOpen(false)} size="default">
        {selectedTask && (
          <div>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label={t('dash_task')}>{selectedTask.title}</Descriptions.Item>
              <Descriptions.Item label={t('dash_type')}><Tag color={TASK_TYPE_MAP[selectedTask.type]?.color}>{TASK_TYPE_MAP[selectedTask.type]?.label}</Tag></Descriptions.Item>
              <Descriptions.Item label={t('dash_priority')}><Tag color={PRIORITY_MAP[selectedTask.priority]?.color}>{PRIORITY_MAP[selectedTask.priority]?.label}</Tag></Descriptions.Item>
              <Descriptions.Item label={t('cust_status')}><Tag color={isOverdue(selectedTask) ? 'error' : STATUS_MAP[selectedTask.status]?.color}>{isOverdue(selectedTask) ? t('task_overdue') : STATUS_MAP[selectedTask.status]?.label}</Tag></Descriptions.Item>
              <Descriptions.Item label={t('cust_owner')}>{selectedTask.assigned_to_name || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('dash_due_date')}><span style={{ color: isOverdue(selectedTask) ? '#ff4d4f' : undefined }}>{selectedTask.due_date ? dayjs(selectedTask.due_date).format('YYYY-MM-DD HH:mm') : '-'}</span></Descriptions.Item>
              {selectedTask.customer_name && <Descriptions.Item label={t('cust_company')}>{selectedTask.customer_name}</Descriptions.Item>}
              {selectedTask.opportunity_name && <Descriptions.Item label={t('nav_pipeline')}>{selectedTask.opportunity_name}</Descriptions.Item>}
              <Descriptions.Item label={t('details')}>{selectedTask.description || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('cust_created')}>{dayjs(selectedTask.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16 }}>
              <Space>
                {selectedTask.status === 'pending' && <Button icon={<PlayCircleOutlined />} onClick={() => { handleStart(selectedTask); setDetailOpen(false); }}>{t('task_start')}</Button>}
                {selectedTask.status !== 'completed' && selectedTask.status !== 'cancelled' && <Button type="primary" icon={<CheckOutlined />} onClick={() => { handleComplete(selectedTask); setDetailOpen(false); }}>{t('task_complete')}</Button>}
                <Button icon={<EditOutlined />} onClick={() => { setDetailOpen(false); openEdit(selectedTask); }}>{t('edit')}</Button>
              </Space>
            </div>
          </div>
        )}
      </Drawer>

      {/* 新建/编辑任务弹窗 */}
      <Modal title={editingTask ? t('task_edit') : t('task_add')} open={modalVisible} onCancel={() => { setModalVisible(false); form.resetFields(); }} onOk={() => form.submit()} width={600}>
        {modalVisible && ( // 仅在Modal打开时渲染Form，避免useForm警告
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item name="title" label={t('dash_task')} rules={[{ required: true, message: t('required') }]}><Input placeholder={t('dash_task')} /></Form.Item>
            <Row gutter={16}>
              <Col span={8}><Form.Item name="type" label={t('dash_type')} rules={[{ required: true }]}><Select options={Object.entries(TASK_TYPE_MAP).map(([k, v]) => ({ value: k, label: v.label }))} /></Form.Item></Col>
              <Col span={8}><Form.Item name="priority" label={t('dash_priority')} initialValue="medium"><Select options={Object.entries(PRIORITY_MAP).map(([k, v]) => ({ value: k, label: v.label }))} /></Form.Item></Col>
              <Col span={8}><Form.Item name="due_date" label={t('dash_due_date')}><DatePicker showTime style={{ width: '100%' }} /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="customer_id" label={t('cust_company')}><Select placeholder={t('cust_company')} allowClear showSearch optionFilterProp="label" options={customers.map(c => ({ value: c.id, label: c.company_name }))} onChange={handleCustomerChange} /></Form.Item></Col>
              <Col span={12}><Form.Item name="opportunity_id" label={t('nav_pipeline')}><Select placeholder={t('nav_pipeline')} allowClear disabled={opportunities.length === 0} options={opportunities.map(o => ({ value: o.id, label: o.name }))} /></Form.Item></Col>
            </Row>
            {isManager && <Form.Item name="assigned_to" label={t('cust_owner')}><Select placeholder={t('cust_owner')} allowClear options={teamMembers.map(m => ({ value: m.id, label: m.name }))} /></Form.Item>}
            <Form.Item name="description" label={t('details')}><Input.TextArea rows={3} placeholder={t('details')} /></Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default TaskList;
