import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, InputNumber, DatePicker, Select, App, Card, Row, Col, Statistic, Alert, Drawer, Descriptions, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, FileTextOutlined, WarningOutlined, EditOutlined, DeleteOutlined, EyeOutlined, SearchOutlined, ReloadOutlined, CopyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { contractService } from '../../services/contractService';
import { customerService } from '../../services/customerService';
import { Contract, ContractStats } from '../../types/contracts';
import { useLanguage } from '../../contexts/LanguageContext';

const ContractList: React.FC = () => {
  const { message } = App.useApp();
  const { t } = useLanguage();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [customers, setCustomers] = useState<{ id: string; company_name: string }[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [form] = Form.useForm();

  const STATUS_MAP: Record<string, { label: string; color: string }> = {
    draft: { label: t('quote_status_draft'), color: 'default' },
    pending: { label: t('quote_status_pending'), color: 'processing' },
    active: { label: t('admin_user_active'), color: 'success' },
    expired: { label: t('dash_expiring_contracts'), color: 'error' },
    terminated: { label: t('order_status_cancelled'), color: 'default' }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [list, statistics] = await Promise.all([contractService.getAll(), contractService.getStatistics()]);
      setContracts(list);
      setStats(statistics);
    } catch { message.error(t('error')); }
    finally { setLoading(false); setSelectedRowKeys([]); }
  }, [message, t]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadCustomers = async () => {
    try { const custs = await customerService.getPrivatePool(); setCustomers(custs); } catch { /* ignore */ }
  };

  const filteredContracts = useMemo(() => contracts.filter(c => {
    const matchSearch = !searchText || c.contract_number?.toLowerCase().includes(searchText.toLowerCase()) || c.title?.toLowerCase().includes(searchText.toLowerCase()) || c.customer_name?.toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  }), [contracts, searchText, statusFilter]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const data = {
        ...values, start_date: values.start_date ? (values.start_date as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
        end_date: values.end_date ? (values.end_date as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
        signed_date: values.signed_date ? (values.signed_date as dayjs.Dayjs).format('YYYY-MM-DD') : undefined
      };
      if (editingContract) { await contractService.update(editingContract.id, data); message.success(t('success')); }
      else { await contractService.create(data); message.success(t('success')); }
      setModalVisible(false); form.resetFields(); setEditingContract(null); loadData();
    } catch { message.error(t('error')); }
  };

  const handleDelete = async (id: string) => {
    try { await contractService.delete(id); message.success(t('success')); loadData(); } catch { message.error(t('error')); }
  };

  const handleBatchDelete = async () => {
    if (!selectedRowKeys.length) return;
    try { await contractService.batchDelete(selectedRowKeys as string[]); message.success(t('success')); loadData(); }
    catch { message.error(t('error')); }
  };

  const handleBatchStatus = async (status: string) => {
    if (!selectedRowKeys.length) return;
    try { await contractService.batchUpdateStatus(selectedRowKeys as string[], status); message.success(t('success')); loadData(); }
    catch { message.error(t('error')); }
  };

  const handleRenew = async (id: string) => {
    try { await contractService.renew(id); message.success(t('success')); loadData(); } catch { message.error(t('error')); }
  };

  const openEdit = (contract: Contract) => {
    setEditingContract(contract);
    setModalVisible(true);
    loadCustomers();
    setTimeout(() => form.setFieldsValue({
      ...contract, start_date: contract.start_date ? dayjs(contract.start_date) : undefined,
      end_date: contract.end_date ? dayjs(contract.end_date) : undefined, signed_date: contract.signed_date ? dayjs(contract.signed_date) : undefined
    }), 0);
  };

  const openDetail = (contract: Contract) => { setSelectedContract(contract); setDetailOpen(true); };

  const getDaysToExpire = (endDate: string) => endDate ? dayjs(endDate).diff(dayjs(), 'day') : null;
  const getExpireColor = (days: number | null) => days === null ? undefined : days <= 7 ? '#ff4d4f' : days <= 15 ? '#faad14' : days <= 30 ? '#1890ff' : undefined;

  const columns = [
    { title: t('order_contract'), dataIndex: 'contract_number', key: 'contract_number', width: 140, render: (v: string, r: Contract) => <a onClick={() => openDetail(r)}>{v}</a> },
    { title: t('contract_title'), dataIndex: 'title', key: 'title', ellipsis: true },
    { title: t('cust_company'), dataIndex: 'customer_name', key: 'customer_name', ellipsis: true },
    { title: t('order_amount'), dataIndex: 'amount', key: 'amount', render: (v: number) => <span style={{ color: '#52c41a', fontWeight: 500 }}>¥{(v || 0).toLocaleString()}</span>, sorter: (a: Contract, b: Contract) => (a.amount || 0) - (b.amount || 0) },
    { title: t('cust_status'), dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={STATUS_MAP[s]?.color}>{STATUS_MAP[s]?.label}</Tag>, filters: Object.entries(STATUS_MAP).map(([k, v]) => ({ text: v.label, value: k })), onFilter: (v: any, r: Contract) => r.status === v },
    {
      title: t('dash_due_date'), dataIndex: 'end_date', key: 'end_date', sorter: (a: Contract, b: Contract) => dayjs(a.end_date || '9999').unix() - dayjs(b.end_date || '9999').unix(), render: (d: string, r: Contract) => {
        if (!d) return '-';
        const days = getDaysToExpire(d);
        const color = r.status === 'active' ? getExpireColor(days) : undefined;
        return <span style={{ color }}>{dayjs(d).format('YYYY-MM-DD')}{days !== null && days <= 30 && r.status === 'active' && <Tag color={color} style={{ marginLeft: 4 }}>{days}d</Tag>}</span>;
      }
    },
    {
      title: t('actions'), key: 'action', width: 160, render: (_: unknown, record: Contract) => (
        <Space size="small">
          <Tooltip title={t('details')}><Button type="text" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)} /></Tooltip>
          <Tooltip title={t('edit')}><Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} /></Tooltip>
          {record.status === 'active' && <Tooltip title={t('refresh')}><Button type="text" size="small" icon={<CopyOutlined />} onClick={() => handleRenew(record.id)} /></Tooltip>}
          <Popconfirm title={t('admin_confirm_delete')} onConfirm={() => handleDelete(record.id)}><Tooltip title={t('delete')}><Button type="text" size="small" danger icon={<DeleteOutlined />} /></Tooltip></Popconfirm>
        </Space>
      )
    }
  ];

  const rowSelection = { selectedRowKeys, onChange: setSelectedRowKeys };

  return (
    <div>
      {/* 到期预警 */}
      {stats && stats.expiring7 > 0 && (
        <Alert type="error" showIcon icon={<WarningOutlined />} style={{ marginBottom: 16 }} message={`${t('warning')}: ${stats.expiring7} (7d)`} />
      )}
      {stats && stats.expiring30 > stats.expiring7 && (
        <Alert type="warning" showIcon icon={<WarningOutlined />} style={{ marginBottom: 16 }} message={`${t('info')}: ${stats.expiring30 - stats.expiring7} (30d)`} />
      )}

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}><Card size="small"><Statistic title={t('all')} value={stats?.total || 0} prefix={<FileTextOutlined />} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title={t('admin_user_active')} value={stats?.active || 0} styles={{ content: { color: '#52c41a' } }} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title="7d" value={stats?.expiring7 || 0} styles={{ content: { color: '#ff4d4f' } }} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title="30d" value={stats?.expiring30 || 0} styles={{ content: { color: '#faad14' } }} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title={t('add')} value={stats?.monthNew || 0} styles={{ content: { color: '#1890ff' } }} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title={t('order_amount')} value={stats?.totalAmount || 0} prefix="¥" /></Card></Col>
      </Row>

      {/* 操作栏 */}
      <Card title={t('contract_title')} extra={
        <Space>
          <Input prefix={<SearchOutlined />} placeholder={t('search')} value={searchText} onChange={e => setSearchText(e.target.value)} style={{ width: 180 }} allowClear />
          <Select value={statusFilter || undefined} onChange={v => setStatusFilter(v || '')} style={{ width: 100 }} placeholder={t('cust_status')} allowClear options={Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))} />
          {selectedRowKeys.length > 0 && (
            <>
              <Popconfirm title={`${t('delete')} ${selectedRowKeys.length}?`} onConfirm={handleBatchDelete}><Button danger icon={<DeleteOutlined />}>{t('delete')} ({selectedRowKeys.length})</Button></Popconfirm>
              <Select placeholder={t('cust_status')} style={{ width: 130 }} onChange={v => handleBatchStatus(v)} options={Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))} />
            </>
          )}
          <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingContract(null); form.resetFields(); setModalVisible(true); loadCustomers(); }}>{t('contract_add')}</Button>
        </Space>
      }>
        <Table columns={columns} dataSource={filteredContracts} rowKey="id" loading={loading} pagination={{ pageSize: 10, showSizeChanger: true, showTotal: total => `${t('all')} ${total}` }} rowSelection={rowSelection} size="small" />
      </Card>

      {/* 合同详情抽屉 */}
      <Drawer title={t('details')} open={detailOpen} onClose={() => setDetailOpen(false)} size="default">
        {selectedContract && (
          <div>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label={t('order_contract')}>{selectedContract.contract_number}</Descriptions.Item>
              <Descriptions.Item label={t('contract_title')}>{selectedContract.title}</Descriptions.Item>
              <Descriptions.Item label={t('cust_company')}>{selectedContract.customer_name || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('order_amount')}><span style={{ color: '#52c41a', fontWeight: 600 }}>¥{(selectedContract.amount || 0).toLocaleString()}</span></Descriptions.Item>
              <Descriptions.Item label={t('cust_status')}><Tag color={STATUS_MAP[selectedContract.status]?.color}>{STATUS_MAP[selectedContract.status]?.label}</Tag></Descriptions.Item>
              <Descriptions.Item label={t('cust_created')}>{selectedContract.start_date ? dayjs(selectedContract.start_date).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
              <Descriptions.Item label={t('dash_due_date')}>{selectedContract.end_date ? dayjs(selectedContract.end_date).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
              <Descriptions.Item label={t('cust_created')}>{dayjs(selectedContract.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16 }}>
              <Space>
                <Button icon={<EditOutlined />} onClick={() => { setDetailOpen(false); openEdit(selectedContract); }}>{t('edit')}</Button>
                {selectedContract.status === 'active' && <Button icon={<CopyOutlined />} onClick={() => { handleRenew(selectedContract.id); setDetailOpen(false); }}>{t('refresh')}</Button>}
              </Space>
            </div>
          </div>
        )}
      </Drawer>

      {/* 新建/编辑合同弹窗 */}
      <Modal title={editingContract ? t('edit') : t('contract_add')} open={modalVisible} onCancel={() => setModalVisible(false)} onOk={() => form.submit()} width={600} forceRender>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="title" label={t('contract_title')} rules={[{ required: true }]}><Input /></Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="customer_id" label={t('cust_company')} rules={[{ required: true }]}><Select placeholder={t('cust_company')} showSearch optionFilterProp="label" options={customers.map(c => ({ value: c.id, label: c.company_name }))} /></Form.Item></Col>
            <Col span={12}><Form.Item name="amount" label={t('order_amount')} rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} prefix="¥" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="start_date" label={t('cust_created')}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="end_date" label={t('dash_due_date')}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="status" label={t('cust_status')} initialValue="draft"><Select options={Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default ContractList;
