import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, Input, Button, Row, Col, Tag, Space, Empty, Typography, Modal, Form, Select, Spin, Popconfirm, App, Checkbox, Table, Dropdown, Statistic, Skeleton, Segmented } from 'antd';
import { SearchOutlined, PlusOutlined, ReloadOutlined, FileExcelOutlined, AppstoreOutlined, UnorderedListOutlined, RiseOutlined, TeamOutlined as TeamIcon, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { customerService, Customer, Contact, CreateCustomerDTO } from '../../services/customerService';
import { useLanguage } from '../../contexts/LanguageContext';
import { CustomerCard, CustomerDetailDrawer, CreateCustomerModal, EditCustomerDrawer, FollowUpModal, ContactModal, ImportModal } from './index';
import { SOURCE_MAP, INDUSTRY_OPTIONS, SOURCE_OPTIONS, MARKET_REGIONS, REGION_COUNTRIES, getMarketByCountry, getRegionLabel } from './constants';
import { exportTemplate, exportCustomerData, parseExcelFile, parseCSVFile, importCustomers, ImportRow } from './utils/exportImport';
import dayjs from 'dayjs';

const { Text } = Typography;

const CustomerList: React.FC = () => {
  const [view, setView] = useState<'private' | 'public_pool'>('private');
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [followUpForm] = Form.useForm();
  const [contactForm] = Form.useForm();
  const [editContactForm] = Form.useForm();
  const [selectedMarket, setSelectedMarket] = useState<string>('');
  const [editMarket, setEditMarket] = useState<string>('');
  const [editContactOpen, setEditContactOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [activeTab, setActiveTab] = useState('info');
  const [listMode, setListMode] = useState<'card' | 'table'>('card');
  const [filterIndustry, setFilterIndustry] = useState<string>();
  const [filterSource, setFilterSource] = useState<string>();
  const [filterMarket, setFilterMarket] = useState<string>();
  const [sortField, setSortField] = useState<string>('company_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const { t } = useLanguage();
  const { message } = App.useApp();

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = view === 'private' ? await customerService.getPrivatePool() : await customerService.getPublicPool();
      setCustomers(data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || t('cust_load_failed'));
    } finally { setLoading(false); }
  }, [view, message, t]);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  const loadCustomerDetail = async (id: string) => {
    try { const data = await customerService.getById(id); setSelectedCustomer(data); }
    catch { message.error(t('cust_detail_failed')); }
  };

  // 过滤和排序的客户列表 - 使用useMemo优化
  const filteredCustomers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return customers.filter((c) => {
      const matchSearch = !term || c.company_name?.toLowerCase().includes(term) || c.industry?.toLowerCase().includes(term) || c.contacts?.some(ct => ct.name?.toLowerCase().includes(term) || ct.phone?.includes(searchTerm));
      const matchIndustry = !filterIndustry || c.industry === filterIndustry;
      const matchSource = !filterSource || c.source === filterSource;
      const matchMarket = !filterMarket || getMarketByCountry(c.region) === filterMarket;
      return matchSearch && matchIndustry && matchSource && matchMarket;
    }).sort((a, b) => {
      let valA: string, valB: string;
      if (sortField === 'company_name') { valA = a.company_name || ''; valB = b.company_name || ''; }
      else if (sortField === 'industry') { valA = a.industry || ''; valB = b.industry || ''; }
      else if (sortField === 'last_contact_date') { valA = a.last_contact_date || ''; valB = b.last_contact_date || ''; }
      else { valA = a.company_name || ''; valB = b.company_name || ''; }
      const cmp = valA < valB ? -1 : valA > valB ? 1 : 0;
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [customers, searchTerm, filterIndustry, filterSource, filterMarket, sortField, sortOrder]);

  // 统计数据 - 使用useMemo优化
  const statsData = useMemo(() => {
    const industryCount: Record<string, number> = {};
    const sourceCount: Record<string, number> = {};
    let newIn7Days = 0;
    const sevenDaysAgo = dayjs().subtract(7, 'day');
    filteredCustomers.forEach(c => {
      industryCount[c.industry || t('cust_unknown')] = (industryCount[c.industry || t('cust_unknown')] || 0) + 1;
      const sourceLabel = SOURCE_MAP[c.source || ''] || t('cust_unknown');
      sourceCount[sourceLabel] = (sourceCount[sourceLabel] || 0) + 1;
      if (c.created_at && dayjs(c.created_at).isAfter(sevenDaysAgo)) newIn7Days++;
    });
    const industryTop3 = Object.entries(industryCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}(${v})`).join(' ') || '-';
    const sourceTop3 = Object.entries(sourceCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}(${v})`).join(' ') || '-';
    return { total: filteredCustomers.length, industryTop3, sourceTop3, newIn7Days };
  }, [filteredCustomers, t]);

  // 表格列定义 - 使用useMemo优化
  const tableColumns = useMemo(() => [
    { title: <Checkbox checked={selectedIds.length > 0 && selectedIds.length === filteredCustomers.length} indeterminate={selectedIds.length > 0 && selectedIds.length < filteredCustomers.length} onChange={(e) => setSelectedIds(e.target.checked ? filteredCustomers.map(c => c.id) : [])} />, dataIndex: 'id', key: 'select', width: 50, render: (_: unknown, record: Customer) => <Checkbox checked={selectedIds.includes(record.id)} onClick={(e) => { e.stopPropagation(); toggleSelect(record.id); }} /> },
    { title: t('cust_table_company'), dataIndex: 'company_name', key: 'company_name', ellipsis: true, sorter: (a: Customer, b: Customer) => (a.company_name || '').localeCompare(b.company_name || '') },
    { title: t('cust_table_contact'), key: 'contact', width: 100, render: (_: unknown, record: Customer) => record.contacts?.[0]?.name || '-' },
    { title: t('cust_table_phone'), key: 'phone', width: 130, render: (_: unknown, record: Customer) => record.contacts?.[0]?.phone || '-' },
    { title: t('cust_table_industry'), dataIndex: 'industry', key: 'industry', width: 80, render: (v: string) => v ? <Tag>{v}</Tag> : '-' },
    { title: t('cust_table_region'), key: 'region', width: 80, render: (_: unknown, record: Customer) => getRegionLabel(record.region) },
    { title: t('cust_table_source'), key: 'source', width: 70, render: (_: unknown, record: Customer) => SOURCE_MAP[record.source || ''] || '-' },
    { title: t('cust_table_last_contact'), dataIndex: 'last_contact_date', key: 'last_contact_date', width: 100, render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD') : '-' },
    { title: t('cust_table_action'), key: 'action', width: 120, render: (_: unknown, record: Customer) => (<Space>{view === 'public_pool' ? <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); handleClaim(record.id); }}>{t('cust_claim')}</Button> : <Popconfirm title={t('cust_confirm_release')} onConfirm={() => handleRelease(record.id)}><Button type="link" size="small" danger onClick={(e) => e.stopPropagation()}>{t('cust_release')}</Button></Popconfirm>}</Space>) },
  ], [selectedIds, filteredCustomers, view, t]);

  // 事件处理函数
  const handleViewDetail = async (customer: Customer) => { setSelectedCustomer(customer); setDetailOpen(true); setActiveTab('info'); await loadCustomerDetail(customer.id); };
  const handleCreate = async (values: CreateCustomerDTO) => { setSubmitting(true); try { await customerService.create(values); message.success(t('success')); setModalOpen(false); form.resetFields(); loadCustomers(); } catch (err: unknown) { const error = err as { response?: { data?: { message?: string } } }; message.error(error.response?.data?.message || t('cust_create_failed')); } finally { setSubmitting(false); } };
  const handleEdit = async (customer: Customer) => { setDetailOpen(false); await loadCustomerDetail(customer.id); const marketRegion = Object.entries(REGION_COUNTRIES).find(([, countries]) => countries.some(c => c.value === customer.region))?.[0] || ''; setEditMarket(marketRegion); editForm.setFieldsValue({ company_name: customer.company_name, industry: customer.industry, market_region: marketRegion, region: customer.region, source: customer.source, last_contact_date: customer.last_contact_date ? dayjs(customer.last_contact_date) : undefined }); setEditOpen(true); };
  const handleEditContact = (contact: Contact) => { setEditingContact(contact); editContactForm.setFieldsValue({ name: contact.name, phone: contact.phone, email: contact.email, role: contact.role }); setEditContactOpen(true); };
  const handleUpdateContact = async (values: Partial<Contact>) => { if (!editingContact) return; setSubmitting(true); try { await customerService.updateContact(editingContact.id, values); message.success(t('cust_contact_updated')); setEditContactOpen(false); editContactForm.resetFields(); if (selectedCustomer) await loadCustomerDetail(selectedCustomer.id); } catch { message.error(t('cust_update_failed')); } finally { setSubmitting(false); } };
  const handleUpdate = async (values: Partial<Customer>) => { if (!selectedCustomer) return; setSubmitting(true); try { await customerService.update(selectedCustomer.id, values); message.success(t('success')); setEditOpen(false); editForm.resetFields(); loadCustomers(); } catch (err: unknown) { const error = err as { response?: { data?: { message?: string } } }; message.error(error.response?.data?.message || t('cust_update_failed')); } finally { setSubmitting(false); } };
  const handleClaim = async (id: string) => { try { await customerService.claim(id); message.success(t('success')); loadCustomers(); } catch (err: unknown) { const error = err as { response?: { data?: { message?: string } } }; message.error(error.response?.data?.message || t('cust_claim_failed')); } };
  const handleRelease = async (id: string) => { try { await customerService.release(id); message.success(t('success')); loadCustomers(); } catch (err: unknown) { const error = err as { response?: { data?: { message?: string } } }; message.error(error.response?.data?.message || t('cust_release_failed')); } };
  const handleBatchClaim = async () => { if (!selectedIds.length) return message.warning(t('cust_select_customer')); try { const result = await customerService.batchClaim(selectedIds); message.success(t('cust_batch_claim_result').replace('{success}', String(result.success)).replace('{failed}', String(result.failed))); setSelectedIds([]); loadCustomers(); } catch { message.error(t('cust_batch_claim_failed')); } };
  const handleBatchRelease = async () => { if (!selectedIds.length) return message.warning(t('cust_select_customer')); try { const result = await customerService.batchRelease(selectedIds); message.success(t('cust_batch_release_result').replace('{success}', String(result.success)).replace('{failed}', String(result.failed))); setSelectedIds([]); loadCustomers(); } catch { message.error(t('cust_batch_release_failed')); } };
  const handleBatchDelete = async (force = false) => { if (!selectedIds.length) return message.warning(t('cust_select_customer')); try { const result = await customerService.batchDelete(selectedIds, force); if (result.failed > 0 && !force && result.errors?.length) { Modal.confirm({ title: t('cust_partial_delete'), content: t('cust_partial_delete_detail').replace('{success}', String(result.success)).replace('{failed}', String(result.failed)), okText: t('cust_force_delete'), okType: 'danger', cancelText: t('cancel'), onOk: () => handleBatchDelete(true) }); } else { message.success(t('cust_batch_delete_result').replace('{success}', String(result.success)).replace('{failed}', String(result.failed))); } setSelectedIds([]); loadCustomers(); } catch { message.error(t('cust_batch_delete_failed')); } };
  const handleAddFollowUp = async (values: { content: string; type: string }) => { if (!selectedCustomer) return; setSubmitting(true); try { await customerService.addFollowUp({ ...values, customer_id: selectedCustomer.id } as { customer_id: string; content: string; type: 'call' | 'visit' | 'email' | 'other' }); message.success(t('cust_followup_added')); setFollowUpOpen(false); followUpForm.resetFields(); await loadCustomerDetail(selectedCustomer.id); } catch { message.error(t('cust_add_failed')); } finally { setSubmitting(false); } };
  const handleAddContact = async (values: Partial<Contact>) => { if (!selectedCustomer) return; setSubmitting(true); try { await customerService.addContact({ ...values, customer_id: selectedCustomer.id }); message.success(t('cust_contact_added')); setContactOpen(false); contactForm.resetFields(); await loadCustomerDetail(selectedCustomer.id); } catch { message.error(t('cust_add_failed')); } finally { setSubmitting(false); } };
  const handleDeleteContact = async (id: string) => { try { await customerService.deleteContact(id); message.success(t('cust_deleted')); if (selectedCustomer) await loadCustomerDetail(selectedCustomer.id); } catch { message.error(t('cust_delete_failed')); } };
  const handleSetPrimary = async (id: string) => { try { await customerService.setPrimaryContact(id); message.success(t('cust_set_primary_success')); if (selectedCustomer) await loadCustomerDetail(selectedCustomer.id); } catch { message.error(t('cust_set_primary_failed')); } };
  const handleDelete = async (id: string, force = false) => { try { const { hasRelations, details } = await customerService.checkRelations(id); if (hasRelations && !force) { Modal.confirm({ title: t('cust_has_relations'), content: t('cust_relations_detail').replace('{opportunities}', String(details.opportunities)).replace('{quotes}', String(details.quotes)).replace('{orders}', String(details.orders)), okText: t('cust_force_delete'), okType: 'danger', cancelText: t('cancel'), onOk: () => handleDelete(id, true) }); return; } await customerService.delete(id, force); message.success(t('msg_delete_success')); setDetailOpen(false); loadCustomers(); } catch (err: unknown) { const error = err as { response?: { data?: { message?: string } } }; message.error(error.response?.data?.message || t('cust_delete_failed')); } };
  const toggleSelect = (id: string) => { setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); };

  // 导入导出处理
  const handleExportTemplate = async () => { await exportTemplate(t); };
  const handleExportData = async () => {
    try {
      const result = await exportCustomerData(view, t);
      message.success(t('cust_export_success').replace('{count}', String(result.count)));
    } catch { message.error(t('cust_export_failed')); }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const result = isExcel ? await parseExcelFile(file, t) : await parseCSVFile(file, t);
    if (result.error) { message.error(result.error); }
    else if (result.data) { setImportData(result.data); setImportModalOpen(true); }
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!importData.length) return;
    setImporting(true);
    try {
      const result = await importCustomers(importData);
      message.success(t('cust_import_result').replace('{success}', String(result.success)).replace('{failed}', String(result.failed)));
      if (result.errors?.length) result.errors.forEach((e: string) => message.warning(e));
      setImportModalOpen(false);
      setImportData([]);
      loadCustomers();
    } catch { message.error(t('cust_import_failed')); }
    setImporting(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <Space>
          <div style={{ display: 'inline-flex', background: '#f0f0f0', borderRadius: 8, padding: 4 }}>
            <Button type={view === 'private' ? 'primary' : 'text'} onClick={() => { setView('private'); setSelectedIds([]); }} style={{ borderRadius: 6 }}>{t('cust_tab_private')}</Button>
            <Button type={view === 'public_pool' ? 'primary' : 'text'} onClick={() => { setView('public_pool'); setSelectedIds([]); }} style={{ borderRadius: 6, ...(view === 'public_pool' ? { background: '#fa8c16', borderColor: '#fa8c16' } : {}) }}>{t('cust_tab_public')}</Button>
          </div>
          {selectedIds.length > 0 && (<Space><Text type="secondary">{t('cust_selected').replace('{count}', String(selectedIds.length))}</Text>{view === 'public_pool' ? <Button size="small" onClick={handleBatchClaim}>{t('cust_batch_claim')}</Button> : <Popconfirm title={t('cust_confirm_batch_release')} onConfirm={handleBatchRelease}><Button size="small" danger>{t('cust_batch_release')}</Button></Popconfirm>}<Popconfirm title={t('cust_confirm_batch_delete')} onConfirm={() => handleBatchDelete(false)}><Button size="small" danger>{t('cust_batch_delete')}</Button></Popconfirm></Space>)}
        </Space>
        <Space>
          <Input prefix={<SearchOutlined />} placeholder={t('cust_search_placeholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: 180 }} allowClear />
          <Select placeholder={t('cust_filter_industry')} value={filterIndustry} onChange={setFilterIndustry} allowClear style={{ width: 100 }} options={INDUSTRY_OPTIONS} />
          <Select placeholder={t('cust_filter_source')} value={filterSource} onChange={setFilterSource} allowClear style={{ width: 90 }} options={SOURCE_OPTIONS} />
          <Select placeholder={t('cust_filter_market')} value={filterMarket} onChange={setFilterMarket} allowClear style={{ width: 90 }} options={MARKET_REGIONS} />
          <Select value={sortField} onChange={setSortField} style={{ width: 100 }} options={[{ value: 'company_name', label: t('cust_sort_company') }, { value: 'industry', label: t('cust_sort_industry') }, { value: 'last_contact_date', label: t('cust_sort_contact') }]} />
          <Button icon={sortOrder === 'asc' ? <span>↑</span> : <span>↓</span>} onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} />
          <Button icon={<ReloadOutlined />} onClick={loadCustomers} loading={loading} />
          <Segmented value={listMode} onChange={(v) => setListMode(v as 'card' | 'table')} options={[{ value: 'card', icon: <AppstoreOutlined /> }, { value: 'table', icon: <UnorderedListOutlined /> }]} />
          <Dropdown trigger={['click']} menu={{ items: [{ key: 'template', icon: <FileExcelOutlined />, label: t('cust_download_template'), onClick: handleExportTemplate }, { key: 'import', icon: <UploadOutlined />, label: t('cust_import_customer'), onClick: () => fileInputRef.current?.click() }, { key: 'export', icon: <DownloadOutlined />, label: t('cust_export_list'), onClick: handleExportData }] }}><Button icon={<FileExcelOutlined />}>{t('cust_import_export')}</Button></Dropdown>
          <input type="file" ref={fileInputRef} accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleFileSelect} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>{t('cust_add_btn')}</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small" variant="borderless"><Statistic title={t('cust_total')} value={statsData.total} prefix={<TeamIcon />} /></Card></Col>
        <Col span={6}><Card size="small" variant="borderless"><Statistic title={t('cust_industry_top3')} value={statsData.industryTop3} /></Card></Col>
        <Col span={6}><Card size="small" variant="borderless"><Statistic title={t('cust_source_top3')} value={statsData.sourceTop3} /></Card></Col>
        <Col span={6}><Card size="small" variant="borderless"><Statistic title={t('cust_new_7days')} value={statsData.newIn7Days} prefix={<RiseOutlined />} /></Card></Col>
      </Row>

      {loading && customers.length === 0 ? (
        <Row gutter={[16, 16]}>{[1, 2, 3, 4, 5, 6].map(i => <Col xs={24} md={12} lg={8} key={i}><Card style={{ borderRadius: 12 }}><Skeleton active avatar paragraph={{ rows: 3 }} /></Card></Col>)}</Row>
      ) : filteredCustomers.length === 0 ? (
        <Empty description={<><Text strong>{t('cust_no_results')}</Text><br /><Text type="secondary">{t('cust_no_results_desc')}</Text></>} />
      ) : listMode === 'table' ? (
        <Spin spinning={loading}><Table columns={tableColumns} dataSource={filteredCustomers} rowKey="id" size="small" pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => t('cust_pagination_total').replace('{total}', String(total)) }} onRow={(record) => ({ onClick: () => handleViewDetail(record), style: { cursor: 'pointer' } })} /></Spin>
      ) : (
        <Row gutter={[16, 16]} style={{ opacity: loading ? 0.6 : 1 }}>{filteredCustomers.map((customer) => (<Col xs={24} md={12} lg={8} key={customer.id}><CustomerCard customer={customer} selected={selectedIds.includes(customer.id)} onSelect={() => toggleSelect(customer.id)} onView={() => handleViewDetail(customer)} onClaim={() => handleClaim(customer.id)} onRelease={() => handleRelease(customer.id)} isPublicPool={view === 'public_pool'} loading={loading} t={t} /></Col>))}</Row>
      )}

      <CreateCustomerModal open={modalOpen} form={form} submitting={submitting} selectedMarket={selectedMarket} onCancel={() => { setModalOpen(false); form.resetFields(); }} onFinish={handleCreate} onMarketChange={(val) => { setSelectedMarket(val); form.setFieldValue('region', undefined); }} t={t} />
      <EditCustomerDrawer open={editOpen} form={editForm} submitting={submitting} editMarket={editMarket} customer={selectedCustomer} onClose={() => setEditOpen(false)} onFinish={handleUpdate} onMarketChange={(val) => { setEditMarket(val); editForm.setFieldValue('region', undefined); }} onAddContact={() => setContactOpen(true)} onEditContact={handleEditContact} onSetPrimary={handleSetPrimary} onDeleteContact={handleDeleteContact} t={t} />
      <CustomerDetailDrawer open={detailOpen} customer={selectedCustomer} activeTab={activeTab} onClose={() => setDetailOpen(false)} onTabChange={setActiveTab} onEdit={() => selectedCustomer && handleEdit(selectedCustomer)} onDelete={() => selectedCustomer && handleDelete(selectedCustomer.id)} onAddContact={() => setContactOpen(true)} onAddFollowUp={() => setFollowUpOpen(true)} onSetPrimary={handleSetPrimary} onDeleteContact={handleDeleteContact} isPrivate={view === 'private'} />
      <FollowUpModal open={followUpOpen} form={followUpForm} submitting={submitting} onCancel={() => { setFollowUpOpen(false); followUpForm.resetFields(); }} onFinish={handleAddFollowUp} t={t} />
      <ContactModal open={contactOpen} form={contactForm} submitting={submitting} title={t('cust_add_contact')} onCancel={() => { setContactOpen(false); contactForm.resetFields(); }} onFinish={handleAddContact} t={t} />
      <ContactModal open={editContactOpen} form={editContactForm} submitting={submitting} title={t('cust_edit_contact')} onCancel={() => { setEditContactOpen(false); editContactForm.resetFields(); }} onFinish={handleUpdateContact} t={t} />
      <ImportModal open={importModalOpen} data={importData} importing={importing} onCancel={() => { setImportModalOpen(false); setImportData([]); }} onOk={handleImport} t={t} />
    </div>
  );
};

export default CustomerList;
