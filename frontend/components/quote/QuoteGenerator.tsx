import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Tabs, Tag, Button, Space, Input, Select, Popconfirm, Row, Col, Statistic, Modal, Form, Table, Empty } from 'antd';
import { PlusOutlined, FileTextOutlined, ReloadOutlined, DeleteOutlined, SearchOutlined, SendOutlined, CheckCircleOutlined, ArrowUpOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Quote } from '../../services/quoteService';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuoteActions } from './hooks/useQuoteActions';
import { STATUS_COLORS, STATUS_STEPS } from './types';
import QuoteTable from './QuoteTable';
import QuoteDetail from './QuoteDetail';
import QuoteForm from './QuoteForm';

const { TextArea } = Input;

const QuoteGenerator: React.FC = () => {
  const { t } = useLanguage();
  const {
    quotes,
    pendingQuotes,
    statistics,
    loading,
    submitting,
    selectedRowKeys,
    setSelectedRowKeys,
    customers,
    products,
    opportunities,
    selectedCustomerId,
    setSelectedCustomerId,
    loadData,
    loadFormData,
    handleCustomerChange,
    handleDelete,
    handleBatchDelete,
    handleBatchSubmit,
    handleCopy,
    handleSubmit,
    handleApprove,
    handleReject,
    handleConvertToOrder,
    handleCreate,
    handleUpdate,
    getDetail
  } = useQuoteActions();

  // UI状态
  const [activeTab, setActiveTab] = useState('list');
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [editQuote, setEditQuote] = useState<Quote | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rejectId, setRejectId] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [rejectForm] = Form.useForm();

  // 状态映射
  const STATUS_MAP: Record<string, { color: string; label: string; step: number }> = useMemo(() => ({
    draft: { color: STATUS_COLORS.draft, label: t('quote_status_draft'), step: STATUS_STEPS.draft },
    pending_manager: { color: STATUS_COLORS.pending_manager, label: t('quote_status_pending'), step: STATUS_STEPS.pending_manager },
    pending_director: { color: STATUS_COLORS.pending_director, label: t('quote_status_pending_director'), step: STATUS_STEPS.pending_director },
    approved: { color: STATUS_COLORS.approved, label: t('quote_status_approved'), step: STATUS_STEPS.approved },
    rejected: { color: STATUS_COLORS.rejected, label: t('quote_status_rejected'), step: STATUS_STEPS.rejected },
    sent: { color: STATUS_COLORS.sent, label: t('quote_status_sent'), step: STATUS_STEPS.sent },
  }), [t]);

  useEffect(() => { loadData(); }, [loadData]);

  // 筛选报价单
  const filteredQuotes = useMemo(() => quotes.filter(q => {
    const matchSearch = !searchText || q.quote_number?.toLowerCase().includes(searchText.toLowerCase()) || q.customer_name?.toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = !statusFilter || q.status === statusFilter;
    return matchSearch && matchStatus;
  }), [quotes, searchText, statusFilter]);

  // 查看详情
  const handleViewDetail = useCallback(async (quote: Quote) => {
    setSelectedQuote(quote);
    setDetailOpen(true);
    setDetailLoading(true);
    const detail = await getDetail(quote.id);
    if (detail) setSelectedQuote(detail);
    setDetailLoading(false);
  }, [getDetail]);

  // 编辑
  const handleEdit = useCallback(async (quote: Quote) => {
    if (!products.length) loadFormData();
    const detail = await getDetail(quote.id);
    if (detail) {
      setEditQuote(detail);
      setEditOpen(true);
    }
  }, [products.length, loadFormData, getDetail]);

  // 创建
  const handleCreateSubmit = useCallback(async (values: { customer_id?: string; opportunity_id?: string; items: { product_id?: string; quantity?: number; unit_price?: number }[] }) => {
    const success = await handleCreate(values);
    if (success) {
      setCreateOpen(false);
      setSelectedCustomerId('');
    }
    return success;
  }, [handleCreate, setSelectedCustomerId]);

  // 更新
  const handleEditSubmit = useCallback(async (values: { items: { product_id?: string; quantity?: number; unit_price?: number }[] }) => {
    if (!editQuote) return false;
    const success = await handleUpdate(editQuote.id, values.items);
    if (success) {
      setEditOpen(false);
      setEditQuote(null);
      if (selectedQuote?.id === editQuote.id) {
        const detail = await getDetail(editQuote.id);
        if (detail) setSelectedQuote(detail);
      }
    }
    return success;
  }, [editQuote, handleUpdate, selectedQuote, getDetail]);

  // 拒绝提交
  const handleRejectSubmit = async (values: { reason: string }) => {
    await handleReject(rejectId, values.reason);
    setRejectOpen(false);
    rejectForm.resetFields();
    if (selectedQuote?.id === rejectId) {
      const detail = await getDetail(rejectId);
      if (detail) setSelectedQuote(detail);
    }
  };

  // 打开拒绝弹窗
  const openRejectModal = useCallback((id: string) => {
    setRejectId(id);
    setRejectOpen(true);
  }, []);

  // 转为订单
  const handleConvert = useCallback(async (quote: Quote) => {
    const success = await handleConvertToOrder(quote);
    if (success) setDetailOpen(false);
  }, [handleConvertToOrder]);

  // 打印
  const handlePrint = useCallback((quote: Quote) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const itemsHtml = (quote.items || []).map((item, idx) =>
      `<tr><td>${idx + 1}</td><td>${item.product_name || '-'}</td><td>${item.product_sku || '-'}</td><td>${item.quantity}</td><td>¥${Number(item.unit_price).toFixed(2)}</td><td>¥${Number(item.total).toLocaleString()}</td></tr>`
    ).join('');
    printWindow.document.write(`<!DOCTYPE html><html><head><title>${t('quote_print_title')} - ${quote.quote_number}</title><style>
      body{font-family:Arial,sans-serif;padding:40px;color:#333}h1{text-align:center;margin-bottom:30px;color:#1890ff}.info{display:flex;flex-wrap:wrap;margin-bottom:20px}.info-item{width:50%;margin-bottom:10px}.label{color:#666;margin-right:8px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:10px;text-align:left}th{background:#f5f5f5}.total{text-align:right;font-size:18px;margin-top:20px;color:#52c41a;font-weight:bold}.footer{margin-top:40px;text-align:center;color:#999;font-size:12px}@media print{body{padding:20px}}
    </style></head><body><h1>${t('quote_print_title')}</h1><div class="info"><div class="info-item"><span class="label">${t('quote_number')}:</span>${quote.quote_number}</div><div class="info-item"><span class="label">${t('quote_customer')}:</span>${quote.customer_name || '-'}</div><div class="info-item"><span class="label">${t('quote_creator')}:</span>${quote.created_by_name || '-'}</div><div class="info-item"><span class="label">${t('quote_create_time')}:</span>${dayjs(quote.created_at).format('YYYY-MM-DD')}</div></div><table><thead><tr><th>#</th><th>${t('quote_product_name')}</th><th>${t('quote_product_sku')}</th><th>${t('quote_quantity')}</th><th>${t('quote_unit_price')}</th><th>${t('quote_subtotal')}</th></tr></thead><tbody>${itemsHtml}</tbody></table><div class="total">${t('quote_total')}: ¥${Number(quote.total_amount || 0).toLocaleString()}</div><div class="footer">${dayjs().format('YYYY-MM-DD HH:mm')}</div></body></html>`);
    printWindow.document.close();
    printWindow.print();
  }, [t]);

  // 待审批表格列
  const pendingColumns = useMemo(() => [
    { title: t('quote_number'), dataIndex: 'quote_number', key: 'quote_number', render: (v: string) => <a>{v}</a> },
    { title: t('quote_customer'), dataIndex: 'customer_name', key: 'customer_name', ellipsis: true },
    { title: t('field_amount'), dataIndex: 'total_amount', key: 'total_amount', render: (v: number) => <span style={{ color: '#52c41a', fontWeight: 500 }}>¥{Number(v || 0).toLocaleString()}</span> },
    { title: t('quote_status'), dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.label || v}</Tag> },
    { title: t('quote_creator'), dataIndex: 'created_by_name', key: 'created_by_name' },
    { title: t('quote_create_time'), dataIndex: 'created_at', key: 'created_at', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
    { title: t('actions'), key: 'action', width: 200, render: (_: unknown, record: Quote) => (
      <Space>
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>{t('quote_view')}</Button>
        <Popconfirm title={t('quote_approve_confirm')} onConfirm={() => handleApprove(record.id)}><Button type="primary" size="small" icon={<CheckCircleOutlined />}>{t('quote_approve')}</Button></Popconfirm>
        <Button size="small" danger onClick={() => openRejectModal(record.id)}>{t('quote_reject')}</Button>
      </Space>
    )}
  ], [t, STATUS_MAP, handleViewDetail, handleApprove, openRejectModal]);

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}><Card size="small"><Statistic title={t('quote_all')} value={statistics?.total || 0} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title={t('quote_drafts')} value={statistics?.draft || 0} styles={{ content: { color: '#8c8c8c' } }} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title={t('quote_pending')} value={statistics?.pending || 0} styles={{ content: { color: statistics?.pending ? '#faad14' : undefined } }} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title={t('quote_approved')} value={statistics?.approved || 0} styles={{ content: { color: '#52c41a' } }} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title={t('quote_month_amount')} value={statistics?.monthAmount || 0} prefix="¥" styles={{ content: { color: '#1890ff' } }} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title={t('quote_conversion')} value={statistics?.conversionRate || 0} suffix="%" prefix={<ArrowUpOutlined />} styles={{ content: { color: '#52c41a' } }} /></Card></Col>
      </Row>

      {/* 操作栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Input prefix={<SearchOutlined />} placeholder={t('quote_search_placeholder')} value={searchText} onChange={e => setSearchText(e.target.value)} style={{ width: 200 }} allowClear />
          <Select placeholder={t('quote_status_filter')} value={statusFilter || undefined} onChange={v => setStatusFilter(v || '')} style={{ width: 120 }} allowClear options={Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))} />
        </Space>
        <Space>
          {selectedRowKeys.length > 0 && (
            <>
              <Popconfirm title={t('quote_batch_delete_confirm').replace('{count}', String(selectedRowKeys.length))} onConfirm={handleBatchDelete}>
                <Button danger icon={<DeleteOutlined />}>{t('quote_batch_delete')} ({selectedRowKeys.length})</Button>
              </Popconfirm>
              <Popconfirm title={t('quote_batch_submit_confirm').replace('{count}', String(selectedRowKeys.length))} onConfirm={handleBatchSubmit}>
                <Button icon={<SendOutlined />}>{t('quote_batch_submit')} ({selectedRowKeys.length})</Button>
              </Popconfirm>
            </>
          )}
          <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreateOpen(true); loadFormData(); }}>{t('quote_new')}</Button>
        </Space>
      </div>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          {
            key: 'list',
            label: <><FileTextOutlined /> {t('quote_all')} ({quotes.length})</>,
            children: (
              <QuoteTable
                quotes={filteredQuotes}
                loading={loading}
                selectedRowKeys={selectedRowKeys}
                onSelectChange={setSelectedRowKeys}
                onView={handleViewDetail}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onCopy={handleCopy}
                onSubmit={handleSubmit}
                onApprove={handleApprove}
                onReject={openRejectModal}
                onConvert={handleConvert}
                statusMap={STATUS_MAP}
                t={t}
              />
            )
          },
          {
            key: 'pending',
            label: <><CheckCircleOutlined /> {t('quote_pending')} ({pendingQuotes.length})</>,
            children: pendingQuotes.length > 0
              ? <Table columns={pendingColumns} dataSource={pendingQuotes} rowKey="id" loading={loading} pagination={false} size="small" />
              : <Empty description={t('quote_no_pending')} />
          }
        ]} />
      </Card>

      {/* 详情抽屉 */}
      <QuoteDetail
        open={detailOpen}
        quote={selectedQuote}
        loading={detailLoading}
        onClose={() => setDetailOpen(false)}
        onEdit={handleEdit}
        onCopy={handleCopy}
        onSubmit={handleSubmit}
        onApprove={handleApprove}
        onReject={openRejectModal}
        onConvert={handleConvert}
        onPrint={handlePrint}
        statusMap={STATUS_MAP}
        t={t}
      />

      {/* 新建表单 */}
      <QuoteForm
        open={createOpen}
        onClose={() => { setCreateOpen(false); setSelectedCustomerId(''); }}
        onSubmit={handleCreateSubmit}
        customers={customers}
        products={products}
        opportunities={opportunities}
        selectedCustomerId={selectedCustomerId}
        onCustomerChange={handleCustomerChange}
        submitting={submitting}
        t={t}
        mode="create"
      />

      {/* 编辑表单 */}
      <QuoteForm
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditQuote(null); }}
        onSubmit={handleEditSubmit}
        customers={customers}
        products={products}
        opportunities={opportunities}
        selectedCustomerId=""
        onCustomerChange={() => {}}
        submitting={submitting}
        t={t}
        mode="edit"
        editQuote={editQuote}
      />

      {/* 拒绝弹窗 */}
      <Modal title={t('quote_reject_title')} open={rejectOpen} onCancel={() => { setRejectOpen(false); rejectForm.resetFields(); }} footer={null}>
        <Form form={rejectForm} layout="vertical" onFinish={handleRejectSubmit}>
          <Form.Item name="reason" label={t('quote_rejection_reason')} rules={[{ required: true, message: t('quote_reject_placeholder') }]}>
            <TextArea rows={3} placeholder={t('quote_reject_placeholder')} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block danger>{t('quote_reject_confirm')}</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default QuoteGenerator;
