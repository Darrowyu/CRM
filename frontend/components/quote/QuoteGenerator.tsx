import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Tabs, Table, Tag, Button, Space, App, Drawer, Descriptions, Modal, Form, Select, InputNumber, Empty, Spin, Input, Popconfirm, Row, Col, Statistic, Steps, Tooltip } from 'antd';
import { PlusOutlined, EyeOutlined, CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined, ReloadOutlined, DeleteOutlined, SearchOutlined, ShoppingCartOutlined, SendOutlined, EditOutlined, PrinterOutlined, CopyOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { quoteService, Quote, QuoteStatistics } from '../../services/quoteService';
import { customerService, Customer } from '../../services/customerService';
import { opportunityService, Opportunity } from '../../services/opportunityService';
import { adminService } from '../../services/adminService';
import { useLanguage } from '../../contexts/LanguageContext';
import dayjs from 'dayjs';

const { TextArea } = Input;

const QuoteGenerator: React.FC = () => {
  const { t } = useLanguage();
  const STATUS_MAP: Record<string, { color: string; label: string; step: number }> = {
    draft: { color: 'default', label: t('quote_status_draft'), step: 0 },
    pending_manager: { color: 'processing', label: t('quote_status_pending'), step: 1 },
    pending_director: { color: 'processing', label: t('quote_status_pending_director'), step: 1 },
    approved: { color: 'success', label: t('quote_status_approved'), step: 2 },
    rejected: { color: 'error', label: t('quote_status_rejected'), step: -1 },
    sent: { color: 'cyan', label: t('quote_status_sent'), step: 3 },
  };
  const [activeTab, setActiveTab] = useState('list');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [pendingQuotes, setPendingQuotes] = useState<Quote[]>([]);
  const [statistics, setStatistics] = useState<QuoteStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string>('');
  const [editOpen, setEditOpen] = useState(false);
  const [editQuote, setEditQuote] = useState<Quote | null>(null);
  const [editForm] = Form.useForm();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [form] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const { message } = App.useApp();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [all, pending, stats] = await Promise.all([quoteService.getAll(), quoteService.getPending(), quoteService.getStatistics()]);
      setQuotes(all);
      setPendingQuotes(pending);
      setStatistics(stats);
    } catch { message.error(t('msg_load_error')); }
    finally { setLoading(false); setSelectedRowKeys([]); }
  }, [message]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadFormData = async () => {
    try {
      const [custs, prods] = await Promise.all([customerService.getPrivatePool(), adminService.getProducts()]);
      setCustomers(custs);
      setProducts(prods);
    } catch { /* ignore */ }
  };

  const handleCustomerChange = async (customerId: string) => {
    setSelectedCustomerId(customerId);
    form.setFieldValue('opportunity_id', undefined);
    if (customerId) {
      try {
        const opps = await opportunityService.getByCustomer(customerId);
        setOpportunities(opps.filter(o => o.stage !== 'closed_lost'));
      } catch { setOpportunities([]); }
    } else { setOpportunities([]); }
  };

  const handleDelete = async (id: string) => {
    try { await quoteService.delete(id); message.success(t('msg_delete_success')); loadData(); } 
    catch { message.error(t('msg_delete_error')); }
  };

  const handleBatchDelete = async () => {
    if (!selectedRowKeys.length) return;
    try {
      const result = await quoteService.batchDelete(selectedRowKeys as string[]);
      message.success(t('msg_batch_delete_success').replace('{count}', String(result.deleted)));
      loadData();
    } catch { message.error(t('msg_delete_error')); }
  };

  const handleBatchSubmit = async () => {
    if (!selectedRowKeys.length) return;
    try {
      const result = await quoteService.batchSubmit(selectedRowKeys as string[]);
      message.success(t('msg_batch_submit_success').replace('{count}', String(result.submitted)));
      loadData();
    } catch { message.error(t('msg_submit_error')); }
  };

  const handleCopy = async (id: string) => {
    try { await quoteService.copy(id); message.success(t('msg_copy_success')); loadData(); } 
    catch { message.error(t('msg_copy_error')); }
  };

  const handleConvertToOrder = async (quote: Quote) => {
    try { await quoteService.convertToOrder(quote.id); message.success(t('quote_convert_success')); loadData(); setDetailOpen(false); } 
    catch (err: any) { message.error(err.response?.data?.message || t('quote_convert_error')); }
  };

  const handleSubmit = async (id: string) => {
    try { await quoteService.submit(id); message.success(t('msg_submit_success')); loadData(); if (selectedQuote?.id === id) handleViewDetail({ id } as Quote); } 
    catch (err: any) { message.error(err.response?.data?.message || t('msg_submit_error')); }
  };

  const handleEdit = async (quote: Quote) => {
    if (!products.length) loadFormData();
    const detail = await quoteService.getById(quote.id);
    setEditQuote(detail);
    setEditOpen(true);
    setTimeout(() => editForm.setFieldsValue({ items: detail.items?.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_price: Number(i.unit_price) })) }), 0);
  };

  const handleEditSubmit = async (values: any) => {
    if (!editQuote || !values.items?.length) return message.warning(t('quote_no_products'));
    setSubmitting(true);
    try {
      await quoteService.update(editQuote.id, values.items);
      message.success(t('msg_update_success'));
      setEditOpen(false);
      editForm.resetFields();
      loadData();
      if (selectedQuote?.id === editQuote.id) handleViewDetail({ id: editQuote.id } as Quote);
    } catch (err: any) { message.error(err.response?.data?.message || t('msg_update_error')); }
    finally { setSubmitting(false); }
  };

  const handlePrint = (quote: Quote) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return message.error(t('quote_print_error'));
    const itemsHtml = (quote.items || []).map((item, idx) => `<tr><td>${idx + 1}</td><td>${item.product_name || '-'}</td><td>${item.product_sku || '-'}</td><td>${item.quantity}</td><td>¥${Number(item.unit_price).toFixed(2)}</td><td>¥${Number(item.total).toLocaleString()}</td></tr>`).join('');
    printWindow.document.write(`<!DOCTYPE html><html><head><title>${t('quote_print_title')} - ${quote.quote_number}</title><style>
      body{font-family:Arial,sans-serif;padding:40px;color:#333}h1{text-align:center;margin-bottom:30px;color:#1890ff}.info{display:flex;flex-wrap:wrap;margin-bottom:20px}.info-item{width:50%;margin-bottom:10px}.label{color:#666;margin-right:8px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:10px;text-align:left}th{background:#f5f5f5}.total{text-align:right;font-size:18px;margin-top:20px;color:#52c41a;font-weight:bold}.footer{margin-top:40px;text-align:center;color:#999;font-size:12px}@media print{body{padding:20px}}
    </style></head><body><h1>${t('quote_print_title')}</h1><div class="info"><div class="info-item"><span class="label">${t('quote_number')}:</span>${quote.quote_number}</div><div class="info-item"><span class="label">${t('quote_customer')}:</span>${quote.customer_name || '-'}</div><div class="info-item"><span class="label">${t('quote_creator')}:</span>${quote.created_by_name || '-'}</div><div class="info-item"><span class="label">${t('quote_create_time')}:</span>${dayjs(quote.created_at).format('YYYY-MM-DD')}</div></div><table><thead><tr><th>#</th><th>${t('quote_product_name')}</th><th>${t('quote_product_sku')}</th><th>${t('quote_quantity')}</th><th>${t('quote_unit_price')}</th><th>${t('quote_subtotal')}</th></tr></thead><tbody>${itemsHtml}</tbody></table><div class="total">${t('quote_total')}: ¥${Number(quote.total_amount || 0).toLocaleString()}</div><div class="footer">${dayjs().format('YYYY-MM-DD HH:mm')}</div></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const filteredQuotes = useMemo(() => quotes.filter(q => {
    const matchSearch = !searchText || q.quote_number?.toLowerCase().includes(searchText.toLowerCase()) || q.customer_name?.toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = !statusFilter || q.status === statusFilter;
    return matchSearch && matchStatus;
  }), [quotes, searchText, statusFilter]);

  const handleViewDetail = async (quote: Quote) => {
    setSelectedQuote(quote);
    setDetailOpen(true);
    setDetailLoading(true);
    try { const detail = await quoteService.getById(quote.id); setSelectedQuote(detail); } 
    catch { message.error(t('msg_load_error')); }
    finally { setDetailLoading(false); }
  };

  const handleCreate = async (values: any) => {
    if (!values.items?.length) return message.warning(t('quote_no_products'));
    setSubmitting(true);
    try {
      await quoteService.create({ customer_id: values.customer_id, opportunity_id: values.opportunity_id, items: values.items });
      message.success(t('msg_save_success'));
      setCreateOpen(false);
      form.resetFields();
      loadData();
    } catch (err: any) { message.error(err.response?.data?.message || t('msg_save_error')); }
    finally { setSubmitting(false); }
  };

  const handleApprove = async (id: string) => {
    try { await quoteService.approve(id); message.success(t('msg_operation_success')); loadData(); if (selectedQuote?.id === id) handleViewDetail({ id } as Quote); } 
    catch { message.error(t('msg_operation_error')); }
  };

  const handleReject = async (values: { reason: string }) => {
    try {
      await quoteService.reject(rejectId, values.reason);
      message.success(t('msg_operation_success'));
      setRejectOpen(false);
      rejectForm.resetFields();
      loadData();
      if (selectedQuote?.id === rejectId) handleViewDetail({ id: rejectId } as Quote);
    } catch { message.error(t('msg_operation_error')); }
  };

  const calcFormTotal = (items: any[]) => items?.reduce((sum, i) => sum + (i?.quantity || 0) * (i?.unit_price || 0), 0) || 0; // 实时计算总金额

  const columns = [
    { title: t('quote_number'), dataIndex: 'quote_number', key: 'quote_number', render: (v: string) => <a>{v}</a> },
    { title: t('quote_customer'), dataIndex: 'customer_name', key: 'customer_name', ellipsis: true },
    { title: t('field_amount'), dataIndex: 'total_amount', key: 'total_amount', render: (v: number) => <span style={{ color: '#52c41a', fontWeight: 500 }}>¥{Number(v || 0).toLocaleString()}</span>, sorter: (a: Quote, b: Quote) => (a.total_amount || 0) - (b.total_amount || 0) },
    { title: t('quote_status'), dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.label || v}</Tag>, filters: Object.entries(STATUS_MAP).map(([k, v]) => ({ text: v.label, value: k })), onFilter: (v: any, r: Quote) => r.status === v },
    { title: t('quote_creator'), dataIndex: 'created_by_name', key: 'created_by_name' },
    { title: t('quote_create_time'), dataIndex: 'created_at', key: 'created_at', render: (v: string) => dayjs(v).format('YYYY-MM-DD'), sorter: (a: Quote, b: Quote) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix() },
    { title: t('actions'), key: 'action', width: 280, render: (_: any, record: Quote) => (
      <Space size="small">
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>{t('quote_view')}</Button>
        <Tooltip title={t('quote_copy')}><Button type="link" size="small" icon={<CopyOutlined />} onClick={() => handleCopy(record.id)} /></Tooltip>
        {record.status === 'pending_manager' && (
          <>
            <Popconfirm title={t('quote_approve_confirm')} onConfirm={() => handleApprove(record.id)}><Button type="link" size="small" style={{ color: '#52c41a' }}>{t('quote_approve')}</Button></Popconfirm>
            <Button type="link" size="small" danger onClick={() => { setRejectId(record.id); setRejectOpen(true); }}>{t('quote_reject')}</Button>
          </>
        )}
        {record.status === 'approved' && <Button type="link" size="small" icon={<ShoppingCartOutlined />} onClick={() => handleConvertToOrder(record)}>{t('quote_convert')}</Button>}
        {record.status === 'draft' && (
          <>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>{t('edit')}</Button>
            <Popconfirm title={t('quote_submit_confirm')} onConfirm={() => handleSubmit(record.id)}><Button type="link" size="small" icon={<SendOutlined />}>{t('submit')}</Button></Popconfirm>
            <Popconfirm title={t('quote_delete_confirm')} onConfirm={() => handleDelete(record.id)}><Button type="link" size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
          </>
        )}
        {record.status === 'rejected' && <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>{t('quote_re_edit')}</Button>}
      </Space>
    )},
  ];

  const pendingColumns = columns.filter(c => c.key !== 'action').concat([
    { title: t('actions'), key: 'action', width: 200, render: (_: any, record: Quote) => (
      <Space>
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>{t('quote_view')}</Button>
        <Popconfirm title={t('quote_approve_confirm')} onConfirm={() => handleApprove(record.id)}><Button type="primary" size="small" icon={<CheckCircleOutlined />}>{t('quote_approve')}</Button></Popconfirm>
        <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => { setRejectId(record.id); setRejectOpen(true); }}>{t('quote_reject')}</Button>
      </Space>
    )},
  ]);

  const rowSelection = { selectedRowKeys, onChange: setSelectedRowKeys, getCheckboxProps: (r: Quote) => ({ disabled: r.status !== 'draft' }) }; // 只能选择草稿

  const renderApprovalSteps = (quote: Quote) => { // 审批流程可视化
    const currentStep = STATUS_MAP[quote.status]?.step ?? 0;
    const isRejected = quote.status === 'rejected';
    return (
      <Steps size="small" current={isRejected ? 1 : currentStep} status={isRejected ? 'error' : undefined} items={[
        { title: t('quote_step_draft'), subTitle: t('quote_step_draft_sub') },
        { title: t('quote_step_pending'), subTitle: isRejected ? t('quote_step_rejected') : t('quote_step_pending_sub') },
        { title: t('quote_step_approved'), subTitle: t('quote_step_approved_sub') },
        { title: t('quote_step_completed'), subTitle: t('quote_step_completed_sub') },
      ]} />
    );
  };

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
              <Popconfirm title={t('quote_batch_delete_confirm').replace('{count}', String(selectedRowKeys.length))} onConfirm={handleBatchDelete}><Button danger icon={<DeleteOutlined />}>{t('quote_batch_delete')} ({selectedRowKeys.length})</Button></Popconfirm>
              <Popconfirm title={t('quote_batch_submit_confirm').replace('{count}', String(selectedRowKeys.length))} onConfirm={handleBatchSubmit}><Button icon={<SendOutlined />}>{t('quote_batch_submit')} ({selectedRowKeys.length})</Button></Popconfirm>
            </>
          )}
          <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreateOpen(true); loadFormData(); }}>{t('quote_new')}</Button>
        </Space>
      </div>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          { key: 'list', label: <><FileTextOutlined /> {t('quote_all')} ({quotes.length})</>, children: (
            <Table columns={columns} dataSource={filteredQuotes} rowKey="id" loading={loading} pagination={{ pageSize: 10, showSizeChanger: true, showTotal: total => t('quote_pagination_total').replace('{total}', String(total)) }} size="small" rowSelection={rowSelection} />
          )},
          { key: 'pending', label: <><CheckCircleOutlined /> {t('quote_pending')} ({pendingQuotes.length})</>, children: (
            pendingQuotes.length > 0 ? <Table columns={pendingColumns} dataSource={pendingQuotes} rowKey="id" loading={loading} pagination={false} size="small" /> : <Empty description={t('quote_no_pending')} />
          )},
        ]} />
      </Card>

      {/* 报价单详情抽屉 */}
      <Drawer title={`${t('quote_detail_title')} - ${selectedQuote?.quote_number || ''}`} open={detailOpen} onClose={() => setDetailOpen(false)} size="large">
        <Spin spinning={detailLoading}>
          {selectedQuote && (
            <div>
              <div style={{ marginBottom: 24 }}>{renderApprovalSteps(selectedQuote)}</div>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label={t('quote_number')}>{selectedQuote.quote_number}</Descriptions.Item>
                <Descriptions.Item label={t('quote_status')}><Tag color={STATUS_MAP[selectedQuote.status]?.color}>{STATUS_MAP[selectedQuote.status]?.label}</Tag></Descriptions.Item>
                <Descriptions.Item label={t('quote_customer')}>{selectedQuote.customer_name || '-'}</Descriptions.Item>
                <Descriptions.Item label={t('quote_total')}><span style={{ color: '#52c41a', fontWeight: 600, fontSize: 16 }}>¥{Number(selectedQuote.total_amount || 0).toLocaleString()}</span></Descriptions.Item>
                <Descriptions.Item label={t('quote_creator')}>{selectedQuote.created_by_name || '-'}</Descriptions.Item>
                <Descriptions.Item label={t('quote_create_time')}>{dayjs(selectedQuote.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
                {selectedQuote.rejection_reason && <Descriptions.Item label={t('quote_rejection_reason')} span={2}><span style={{ color: '#ff4d4f' }}>{selectedQuote.rejection_reason}</span></Descriptions.Item>}
              </Descriptions>

              <Card size="small" title={t('quote_product_detail')} style={{ marginTop: 16 }}>
                <Table size="small" pagination={false} dataSource={selectedQuote.items || []} rowKey="id" columns={[
                  { title: t('quote_product_name'), dataIndex: 'product_name', key: 'product_name' },
                  { title: t('quote_product_sku'), dataIndex: 'product_sku', key: 'product_sku' },
                  { title: t('quote_quantity'), dataIndex: 'quantity', key: 'quantity' },
                  { title: t('quote_unit_price'), dataIndex: 'unit_price', key: 'unit_price', render: (v: number) => `¥${Number(v).toFixed(2)}` },
                  { title: t('quote_subtotal'), dataIndex: 'total', key: 'total', render: (v: number) => <span style={{ color: '#52c41a' }}>¥{Number(v).toLocaleString()}</span> },
                ]} summary={() => <Table.Summary.Row><Table.Summary.Cell index={0} colSpan={4} align="right"><strong>{t('quote_total_label')}</strong></Table.Summary.Cell><Table.Summary.Cell index={1}><strong style={{ color: '#52c41a' }}>¥{Number(selectedQuote.total_amount || 0).toLocaleString()}</strong></Table.Summary.Cell></Table.Summary.Row>} />
              </Card>

              {selectedQuote.approval_logs && selectedQuote.approval_logs.length > 0 && (
                <Card size="small" title={t('quote_approval_log')} style={{ marginTop: 16 }}>
                  <Table size="small" pagination={false} dataSource={selectedQuote.approval_logs} rowKey="id" columns={[
                    { title: t('quote_action'), dataIndex: 'action', render: (v: string) => <Tag color={v === 'approve' ? 'success' : 'error'}>{v === 'approve' ? t('quote_action_approve') : t('quote_action_reject')}</Tag> },
                    { title: t('quote_approver'), dataIndex: 'approver_name' },
                    { title: t('quote_comment'), dataIndex: 'comment', render: (v: string) => v || '-' },
                    { title: t('log_time'), dataIndex: 'created_at', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
                  ]} />
                </Card>
              )}

              <div style={{ marginTop: 24 }}>
                <Space>
                  <Button icon={<PrinterOutlined />} onClick={() => handlePrint(selectedQuote)}>{t('quote_print_export')}</Button>
                  <Button icon={<CopyOutlined />} onClick={() => { handleCopy(selectedQuote.id); setDetailOpen(false); }}>{t('quote_copy_quote')}</Button>
                  {(selectedQuote.status === 'draft' || selectedQuote.status === 'rejected') && (
                    <>
                      <Button icon={<EditOutlined />} onClick={() => { setDetailOpen(false); handleEdit(selectedQuote); }}>{t('edit')}</Button>
                      {selectedQuote.status === 'draft' && <Popconfirm title={t('quote_submit_confirm')} onConfirm={() => handleSubmit(selectedQuote.id)}><Button type="primary" icon={<SendOutlined />}>{t('quote_submit_approval')}</Button></Popconfirm>}
                    </>
                  )}
                  {selectedQuote.status === 'pending_manager' && (
                    <>
                      <Popconfirm title={t('quote_approve_confirm')} onConfirm={() => handleApprove(selectedQuote.id)}><Button type="primary" icon={<CheckCircleOutlined />}>{t('quote_approve')}</Button></Popconfirm>
                      <Button danger icon={<CloseCircleOutlined />} onClick={() => { setRejectId(selectedQuote.id); setRejectOpen(true); }}>{t('quote_reject')}</Button>
                    </>
                  )}
                  {selectedQuote.status === 'approved' && <Button type="primary" icon={<ShoppingCartOutlined />} onClick={() => handleConvertToOrder(selectedQuote)}>{t('quote_convert_order')}</Button>}
                </Space>
              </div>
            </div>
          )}
        </Spin>
      </Drawer>

      {/* 新建报价单弹窗 */}
      <Modal title={t('quote_create_title')} open={createOpen} onCancel={() => { setCreateOpen(false); form.resetFields(); setSelectedCustomerId(''); }} footer={null} width={700}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="customer_id" label={t('quote_customer')} rules={[{ required: true, message: t('quote_select_customer_required') }]}>
                <Select placeholder={t('quote_select_customer')} showSearch optionFilterProp="label" options={customers.map(c => ({ value: c.id, label: c.company_name }))} onChange={handleCustomerChange} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="opportunity_id" label={t('quote_related_opp')}>
                <Select placeholder={t('quote_select_opp')} allowClear disabled={!selectedCustomerId} options={opportunities.map(o => ({ value: o.id, label: `${o.name} (¥${Number(o.amount || 0).toLocaleString()})` }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 500 }}>{t('quote_product_detail')}</span>
                  <Space><Form.Item noStyle shouldUpdate>{() => <Tag color="blue">{t('quote_estimated_total')}: ¥{calcFormTotal(form.getFieldValue('items')).toLocaleString()}</Tag>}</Form.Item><Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add()}>{t('quote_add_product')}</Button></Space>
                </div>
                {fields.map(({ key, name }) => (
                  <Row gutter={8} key={key} style={{ marginBottom: 8 }}>
                    <Col span={10}><Form.Item name={[name, 'product_id']} rules={[{ required: true }]} style={{ marginBottom: 0 }}><Select placeholder={t('quote_select_product')} showSearch optionFilterProp="label" options={products.map(p => ({ value: p.id, label: `${p.name} (${p.sku}) - ¥${p.price}` }))} /></Form.Item></Col>
                    <Col span={5}><Form.Item name={[name, 'quantity']} rules={[{ required: true }]} style={{ marginBottom: 0 }}><InputNumber placeholder={t('quote_quantity')} min={1} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={5}><Form.Item name={[name, 'unit_price']} rules={[{ required: true }]} style={{ marginBottom: 0 }}><InputNumber placeholder={t('quote_unit_price')} min={0} step={0.01} prefix="¥" style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={4}><Button icon={<DeleteOutlined />} onClick={() => remove(name)} danger /></Col>
                  </Row>
                ))}
                {fields.length === 0 && <Empty description={t('quote_no_products')} image={Empty.PRESENTED_IMAGE_SIMPLE} />}
              </div>
            )}
          </Form.List>
          <Form.Item style={{ marginTop: 24 }}><Button type="primary" htmlType="submit" loading={submitting} block>{t('quote_create_btn')}</Button></Form.Item>
        </Form>
      </Modal>

      {/* 拒绝原因弹窗 */}
      <Modal title={t('quote_reject_title')} open={rejectOpen} onCancel={() => { setRejectOpen(false); rejectForm.resetFields(); }} footer={null}>
        <Form form={rejectForm} layout="vertical" onFinish={handleReject}>
          <Form.Item name="reason" label={t('quote_rejection_reason')} rules={[{ required: true, message: t('quote_reject_placeholder') }]}><TextArea rows={3} placeholder={t('quote_reject_placeholder')} /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" block danger>{t('quote_reject_confirm')}</Button></Form.Item>
        </Form>
      </Modal>

      {/* 编辑报价单弹窗 */}
      <Modal title={`${t('quote_edit_title')} - ${editQuote?.quote_number || ''}`} open={editOpen} onCancel={() => { setEditOpen(false); editForm.resetFields(); }} footer={null} width={700}>
        <Form form={editForm} layout="vertical" onFinish={handleEditSubmit}>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 500 }}>{t('quote_product_detail')}</span>
                  <Space><Form.Item noStyle shouldUpdate>{() => <Tag color="blue">{t('quote_estimated_total')}: ¥{calcFormTotal(editForm.getFieldValue('items')).toLocaleString()}</Tag>}</Form.Item><Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add()}>{t('quote_add_product')}</Button></Space>
                </div>
                {fields.map(({ key, name }) => (
                  <Row gutter={8} key={key} style={{ marginBottom: 8 }}>
                    <Col span={10}><Form.Item name={[name, 'product_id']} rules={[{ required: true }]} style={{ marginBottom: 0 }}><Select placeholder={t('quote_select_product')} showSearch optionFilterProp="label" options={products.map(p => ({ value: p.id, label: `${p.name} (${p.sku}) - ¥${p.price}` }))} /></Form.Item></Col>
                    <Col span={5}><Form.Item name={[name, 'quantity']} rules={[{ required: true }]} style={{ marginBottom: 0 }}><InputNumber placeholder={t('quote_quantity')} min={1} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={5}><Form.Item name={[name, 'unit_price']} rules={[{ required: true }]} style={{ marginBottom: 0 }}><InputNumber placeholder={t('quote_unit_price')} min={0} step={0.01} prefix="¥" style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={4}><Button icon={<DeleteOutlined />} onClick={() => remove(name)} danger /></Col>
                  </Row>
                ))}
                {fields.length === 0 && <Empty description={t('quote_no_products')} image={Empty.PRESENTED_IMAGE_SIMPLE} />}
              </div>
            )}
          </Form.List>
          <Form.Item style={{ marginTop: 24 }}><Button type="primary" htmlType="submit" loading={submitting} block>{t('quote_save_changes')}</Button></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default QuoteGenerator;
