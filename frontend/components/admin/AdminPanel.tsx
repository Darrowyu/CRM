import React, { useState, useEffect } from 'react';
import { Card, Tabs, Table, Button, Tag, Space, Typography, Input, message, Alert, Modal, Form, Select, Popconfirm, Statistic, Row, Col, InputNumber, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import * as ExcelJS from 'exceljs';
import { UserOutlined, ShoppingOutlined, HistoryOutlined, CloudServerOutlined, SettingOutlined, PlusOutlined, DeleteOutlined, KeyOutlined, SafetyCertificateOutlined, EditOutlined, ReloadOutlined, BookOutlined, NotificationOutlined, AuditOutlined, ApartmentOutlined, MailOutlined, DashboardOutlined, GlobalOutlined, DownloadOutlined } from '@ant-design/icons';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../services/api';
import DictionaryManager from './DictionaryManager';
import AnnouncementManager from './AnnouncementManager';
import ApprovalConfigManager from './ApprovalConfigManager';
import RolePermissionManager from './RolePermissionManager';
import DepartmentManager from './DepartmentManager';
import TemplateManager from './TemplateManager';
import SystemMonitor from './SystemMonitor';
import DataArchiveManager from './DataArchiveManager';
import TranslationManager from './TranslationManager';
import DataExporter from './DataExporter';
import OperationLogViewer from './OperationLogViewer';
import AdminDashboard from './AdminDashboard';
import SecurityCenter from './SecurityCenter';
import SystemConfigManager from './SystemConfigManager';

const { Title, Text } = Typography;

interface User { id: string; username: string; name: string; role: string; created_at?: string; }
interface Product { id: string; name: string; sku?: string; base_price: number; floor_price: number; }
interface PricingTier { id: string; product_id: string; min_quantity: number; unit_price: number; }
interface Stats { totalUsers: number; totalCustomers: number; totalOpportunities: number; totalQuotes: number; totalOrders: number; }

const AdminPanel: React.FC = () => {
  const { t } = useLanguage();
  const items = [
    { key: 'dashboard', label: <Space><DashboardOutlined />{t('admin_overview')}</Space>, children: <AdminDashboard /> },
    { key: 'users', label: <Space><UserOutlined />{t('admin_users')}</Space>, children: <UserManagement /> },
    { key: 'products', label: <Space><ShoppingOutlined />{t('admin_products')}</Space>, children: <ProductManagement /> },
    { key: 'security', label: <Space><SafetyCertificateOutlined />{t('admin_security')}</Space>, children: <SecurityCenter /> },
    { key: 'dictionaries', label: <Space><BookOutlined />{t('admin_dictionary')}</Space>, children: <DictionaryManager /> },
    { key: 'announcements', label: <Space><NotificationOutlined />{t('admin_announcement')}</Space>, children: <AnnouncementManager /> },
    { key: 'approval', label: <Space><AuditOutlined />{t('admin_approval_flow')}</Space>, children: <ApprovalConfigManager /> },
    { key: 'roles', label: <Space><SafetyCertificateOutlined />{t('admin_role_permission')}</Space>, children: <RolePermissionManager /> },
    { key: 'departments', label: <Space><ApartmentOutlined />{t('admin_department')}</Space>, children: <DepartmentManager /> },
    { key: 'templates', label: <Space><MailOutlined />{t('admin_template')}</Space>, children: <TemplateManager /> },
    { key: 'monitor', label: <Space><DashboardOutlined />{t('admin_monitor')}</Space>, children: <SystemMonitor /> },
    { key: 'archive', label: <Space><HistoryOutlined />{t('admin_archive')}</Space>, children: <DataArchiveManager /> },
    { key: 'translations', label: <Space><GlobalOutlined />{t('admin_translation')}</Space>, children: <TranslationManager /> },
    { key: 'export', label: <Space><DownloadOutlined />{t('admin_data_export')}</Space>, children: <DataExporter /> },
    { key: 'logs', label: <Space><HistoryOutlined />{t('admin_logs')}</Space>, children: <OperationLogViewer /> },
    { key: 'backup', label: <Space><CloudServerOutlined />{t('admin_backup')}</Space>, children: <BackupPanel /> },
    { key: 'config', label: <Space><SettingOutlined />{t('admin_settings')}</Space>, children: <SystemConfigManager /> },
    { key: 'settings', label: <Space><SettingOutlined />{t('admin_settings')}</Space>, children: <SystemSettings /> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#f9f0ff', padding: 12, borderRadius: 12 }}><SafetyCertificateOutlined style={{ fontSize: 24, color: '#722ed1' }} /></div>
        <div><Title level={3} style={{ margin: 0 }}>{t('admin_title')}</Title><Text type="secondary">{t('admin_settings')}</Text></div>
      </div>
      <Card><Tabs items={items} tabPlacement="start" style={{ minHeight: 500 }} /></Card>
    </div>
  );
};

const UserManagement: React.FC = () => {
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [pwdForm] = Form.useForm();

  const fetchUsers = async () => { setLoading(true); try { const { data } = await api.get('/admin/users'); setUsers(data); } catch { message.error(t('error')); } setLoading(false); };
  useEffect(() => { fetchUsers(); }, []);

  const handleSubmit = async (values: any) => {
    try {
      if (editingUser) await api.put(`/admin/users/${editingUser.id}`, values);
      else await api.post('/admin/users', values);
      message.success(t('success')); setModalOpen(false); form.resetFields(); setEditingUser(null); fetchUsers();
    } catch { message.error(t('error')); }
  };

  const handleDelete = async (id: string) => { try { await api.delete(`/admin/users/${id}`); message.success(t('success')); fetchUsers(); } catch { message.error(t('error')); } };
  const handleResetPassword = async (values: { password: string }) => { if (!editingUser) return; try { await api.put(`/admin/users/${editingUser.id}/password`, values); message.success(t('success')); setPwdModalOpen(false); pwdForm.resetFields(); setEditingUser(null); } catch { message.error(t('error')); } };
  const openEdit = (user: User) => { setEditingUser(user); form.setFieldsValue(user); setModalOpen(true); };
  const openPwdReset = (user: User) => { setEditingUser(user); setPwdModalOpen(true); };

  const columns = [
    { title: t('admin_user_username'), dataIndex: 'username', key: 'username' },
    { title: t('admin_user_name'), dataIndex: 'name', key: 'name' },
    { title: t('admin_user_role'), dataIndex: 'role', key: 'role', render: (role: string) => { const colors: Record<string, string> = { admin: 'purple', sales_manager: 'blue', sales_rep: 'green', finance: 'orange' }; return <Tag color={colors[role]}>{t(`role_${role}` as any)}</Tag>; }},
    { title: t('actions'), key: 'actions', render: (_: any, record: User) => (
      <Space>
        <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} />
        <Button type="text" icon={<KeyOutlined />} size="small" onClick={() => openPwdReset(record)} />
        <Popconfirm title={t('admin_delete_user_confirm')} onConfirm={() => handleDelete(record.id)} okText={t('yes')} cancelText={t('no')}><Button type="text" danger icon={<DeleteOutlined />} size="small" /></Popconfirm>
      </Space>
    )},
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={5}>{t('admin_users')}</Title>
        <Space><Button icon={<ReloadOutlined />} onClick={fetchUsers}>{t('refresh')}</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingUser(null); form.resetFields(); setModalOpen(true); }}>{t('admin_add_user')}</Button></Space>
      </div>
      <Table dataSource={users} columns={columns} rowKey="id" loading={loading} pagination={false} />
      <Modal title={editingUser ? t('admin_edit_user') : t('admin_add_user')} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText={t('save')} cancelText={t('cancel')}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {!editingUser && <Form.Item name="username" label={t('admin_user_username')} rules={[{ required: true }]}><Input /></Form.Item>}
          {!editingUser && <Form.Item name="password" label={t('login_password')} rules={[{ required: true }]}><Input.Password /></Form.Item>}
          <Form.Item name="name" label={t('admin_user_name')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="role" label={t('admin_user_role')} rules={[{ required: true }]}><Select options={[{ value: 'admin', label: t('role_admin') }, { value: 'sales_manager', label: t('role_sales_manager') }, { value: 'sales_rep', label: t('role_sales_rep') }, { value: 'finance', label: t('role_finance') }]} /></Form.Item>
        </Form>
      </Modal>
      <Modal title={t('admin_reset_password')} open={pwdModalOpen} onCancel={() => setPwdModalOpen(false)} onOk={() => pwdForm.submit()} okText={t('save')} cancelText={t('cancel')}>
        <Form form={pwdForm} layout="vertical" onFinish={handleResetPassword}><Form.Item name="password" label={t('admin_new_password')} rules={[{ required: true }]}><Input.Password /></Form.Item></Form>
      </Modal>
    </div>
  );
};

const ProductManagement: React.FC = () => {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [tierModalOpen, setTierModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [importing, setImporting] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [form] = Form.useForm();
  const [tierForm] = Form.useForm();
  const [stockForm] = Form.useForm();

  const fetchProducts = async () => { setLoading(true); try { const { data } = await api.get('/admin/products'); setProducts(data); } catch { message.error(t('error')); } setLoading(false); };
  const fetchCategories = async () => { try { const { data } = await api.get('/admin/products/categories'); setCategories(data); } catch { /* ignore */ } };
  useEffect(() => { fetchProducts(); fetchCategories(); }, []);

  const handleSubmit = async (values: any) => { try { if (editingProduct) await api.put(`/admin/products/${editingProduct.id}`, values); else await api.post('/admin/products', values); message.success(t('success')); setModalOpen(false); form.resetFields(); setEditingProduct(null); fetchProducts(); fetchCategories(); } catch { message.error(t('error')); } };
  const handleDelete = async (id: string) => { try { await api.delete(`/admin/products/${id}`); message.success(t('success')); fetchProducts(); } catch { message.error(t('error')); } };
  const openEdit = (product: Product) => { setEditingProduct(product); form.setFieldsValue(product); setModalOpen(true); };
  const openTiers = async (product: Product) => { setEditingProduct(product); try { const { data } = await api.get(`/admin/products/${product.id}/tiers`); setTiers(data); setTierModalOpen(true); } catch { message.error(t('error')); } };
  const handleAddTier = async (values: { min_quantity: number; unit_price: number }) => { if (!editingProduct) return; try { await api.post(`/admin/products/${editingProduct.id}/tiers`, values); const { data } = await api.get(`/admin/products/${editingProduct.id}/tiers`); setTiers(data); tierForm.resetFields(); message.success(t('success')); } catch { message.error(t('error')); } };
  const handleDeleteTier = async (tierId: string) => { if (!editingProduct) return; try { await api.delete(`/admin/products/${editingProduct.id}/tiers/${tierId}`); setTiers(tiers.filter(t => t.id !== tierId)); message.success(t('success')); } catch { message.error(t('error')); } };
  const openStock = (product: Product) => { setEditingProduct(product); stockForm.setFieldsValue({ stock: (product as any).stock || 0, operation: 'set' }); setStockModalOpen(true); };
  const handleExcelUpload = async (file: File) => { // 解析Excel文件
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const sheet = workbook.worksheets[0];
    const rows: any[] = [];
    sheet.eachRow((row, idx) => {
      if (idx === 1) return; // 跳过表头
      const [, name, sku, base_price, floor_price, category, stock] = row.values as any[];
      if (name && base_price) rows.push({ name, sku, base_price: parseFloat(base_price) || 0, floor_price: parseFloat(floor_price), category, stock: parseInt(stock) || 0 });
    });
    setImportData(rows);
    message.success(t('admin_parsed_rows').replace('{count}', String(rows.length)));
    return false; // 阻止自动上传
  };
  const handleBatchImport = async () => { // 批量导入产品
    if (!importData.length) return message.warning(t('admin_upload_first'));
    setImporting(true);
    try {
      const { data } = await api.post('/admin/products/batch-import', { products: importData });
      message.success(t('admin_import_success').replace('{imported}', data.imported).replace('{total}', data.total));
      setImportModalOpen(false); setImportData([]); fetchProducts(); fetchCategories();
    } catch { message.error(t('admin_import_fail')); }
    setImporting(false);
  };
  const downloadTemplate = () => { // 下载模板
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Template');
    sheet.columns = [{ header: t('admin_product_name'), key: 'name', width: 20 }, { header: 'SKU', key: 'sku', width: 15 }, { header: t('admin_product_price'), key: 'base_price', width: 12 }, { header: t('admin_product_floor'), key: 'floor_price', width: 12 }, { header: t('admin_category'), key: 'category', width: 15 }, { header: t('admin_stock'), key: 'stock', width: 10 }];
    sheet.addRow({ name: 'iPhone 15', sku: 'IP15-001', base_price: 999, floor_price: 899, category: 'Phone', stock: 100 });
    workbook.xlsx.writeBuffer().then(buffer => { const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'product_template.xlsx'; a.click(); });
  };
  const handleUpdateStock = async (values: { quantity: number; operation: string }) => { // 更新库存
    if (!editingProduct) return;
    try { await api.put(`/admin/products/${editingProduct.id}/stock`, { stock: values.quantity, operation: values.operation }); message.success(t('success')); setStockModalOpen(false); fetchProducts(); } catch { message.error(t('error')); }
  };

  const columns = [
    { title: t('admin_product_name'), dataIndex: 'name', key: 'name' },
    { title: t('admin_product_sku'), dataIndex: 'sku', key: 'sku' },
    { title: t('admin_category'), dataIndex: 'category', key: 'category', render: (v: string) => v ? <Tag>{v}</Tag> : '-' },
    { title: t('admin_stock'), dataIndex: 'stock', key: 'stock', render: (v: number) => <Tag color={(v || 0) < 10 ? 'red' : 'green'}>{v || 0}</Tag> },
    { title: t('admin_product_price'), dataIndex: 'base_price', key: 'base_price', render: (v: any) => `$${Number(v || 0).toFixed(2)}` },
    { title: t('admin_product_floor'), dataIndex: 'floor_price', key: 'floor_price', render: (v: any) => <Text type="danger">${Number(v || 0).toFixed(2)}</Text> },
    { title: t('actions'), key: 'actions', render: (_: any, record: Product) => (
      <Space>
        <Button type="text" size="small" onClick={() => openTiers(record)}>{t('admin_pricing_tiers')}</Button>
        <Button type="text" size="small" onClick={() => openStock(record)}>{t('admin_stock')}</Button>
        <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} />
        <Popconfirm title={t('admin_delete_product_confirm')} onConfirm={() => handleDelete(record.id)} okText={t('yes')} cancelText={t('no')}><Button type="text" danger icon={<DeleteOutlined />} size="small" /></Popconfirm>
      </Space>
    )},
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={5}>{t('admin_products')}</Title>
        <Space><Button icon={<ReloadOutlined />} onClick={fetchProducts}>{t('refresh')}</Button><Button onClick={() => setImportModalOpen(true)}>{t('admin_batch_import')}</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingProduct(null); form.resetFields(); setModalOpen(true); }}>{t('admin_add_product')}</Button></Space>
      </div>
      <Table dataSource={products} columns={columns} rowKey="id" loading={loading} pagination={false} />
      <Modal title={editingProduct ? t('admin_edit_product') : t('admin_add_product')} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText={t('save')} cancelText={t('cancel')} forceRender>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label={t('admin_product_name')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="sku" label={t('admin_product_sku')}><Input /></Form.Item>
          <Form.Item name="category" label={t('admin_category')}><Select allowClear placeholder={t('msg_select_hint')} options={categories.map(c => ({ value: c, label: c }))} /></Form.Item>
          <Form.Item name="base_price" label={t('admin_product_price')} rules={[{ required: true }]}><InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix="$" /></Form.Item>
          <Form.Item name="floor_price" label={t('admin_product_floor')} rules={[{ required: true }]}><InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix="$" /></Form.Item>
          <Form.Item name="stock" label={t('admin_stock')}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
      <Modal title={`${t('admin_pricing_tiers')} - ${editingProduct?.name}`} open={tierModalOpen} onCancel={() => setTierModalOpen(false)} footer={null} width={500} forceRender>
        <Form form={tierForm} layout="inline" onFinish={handleAddTier} style={{ marginBottom: 16 }}>
          <Form.Item name="min_quantity" rules={[{ required: true }]}><InputNumber placeholder={t('admin_min_quantity')} min={1} /></Form.Item>
          <Form.Item name="unit_price" rules={[{ required: true }]}><InputNumber placeholder={t('admin_unit_price')} min={0} step={0.01} prefix="$" /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" icon={<PlusOutlined />}>{t('add')}</Button></Form.Item>
        </Form>
        {tiers.length === 0 ? <Text type="secondary">{t('admin_no_tiers')}</Text> : (
          <Table dataSource={tiers} rowKey="id" pagination={false} size="small" columns={[
            { title: t('admin_min_quantity'), dataIndex: 'min_quantity', render: (v: number) => `≥ ${v}` },
            { title: t('admin_unit_price'), dataIndex: 'unit_price', render: (v: any) => `$${Number(v || 0).toFixed(2)}` },
            { title: '', key: 'action', width: 50, render: (_: any, tier: PricingTier) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteTier(tier.id)} /> }
          ]} />
        )}
      </Modal>
      <Modal title={t('admin_batch_import')} open={importModalOpen} onCancel={() => { setImportModalOpen(false); setImportData([]); }} onOk={handleBatchImport} confirmLoading={importing} okText={t('import')} cancelText={t('cancel')} forceRender>
        <Space style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <Alert title={t('admin_import_hint')} type="info" />
          <Space><Upload accept=".xlsx,.xls" showUploadList={false} beforeUpload={handleExcelUpload}><Button icon={<UploadOutlined />}>{t('import')}</Button></Upload><Button onClick={downloadTemplate}>{t('admin_download_template')}</Button></Space>
          {importData.length > 0 && <Table dataSource={importData} rowKey={(_, i) => i!} size="small" pagination={false} scroll={{ y: 200 }} columns={[{ title: t('admin_product_name'), dataIndex: 'name' }, { title: 'SKU', dataIndex: 'sku' }, { title: t('admin_product_price'), dataIndex: 'base_price' }, { title: t('admin_product_floor'), dataIndex: 'floor_price' }, { title: t('admin_category'), dataIndex: 'category' }, { title: t('admin_stock'), dataIndex: 'stock' }]} />}
        </Space>
      </Modal>
      <Modal title={`${t('admin_stock_manage')} - ${editingProduct?.name}`} open={stockModalOpen} onCancel={() => setStockModalOpen(false)} onOk={() => stockForm.submit()} okText={t('save')} cancelText={t('cancel')} forceRender>
        <Form form={stockForm} layout="vertical" onFinish={handleUpdateStock}>
          <Form.Item name="operation" label={t('admin_stock_operation')} rules={[{ required: true }]}><Select options={[{ value: 'set', label: t('admin_stock_set') }, { value: 'add', label: t('admin_stock_add') }, { value: 'subtract', label: t('admin_stock_subtract') }]} /></Form.Item>
          <Form.Item name="quantity" label={t('quote_quantity')} rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

const BackupPanel: React.FC = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);
  const [backing, setBacking] = useState(false);

  const fetchStats = async () => { try { const { data } = await api.get('/admin/stats'); setStats(data); } catch { /* ignore */ } };
  useEffect(() => { fetchStats(); }, []);

  const handleBackup = async () => { setBacking(true); try { await api.post('/admin/backup'); message.success(t('admin_backup_success')); } catch { message.error(t('error')); } setBacking(false); };

  return (
    <div>
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={4}><Card><Statistic title={t('admin_stats_users')} value={stats.totalUsers} prefix={<UserOutlined />} /></Card></Col>
          <Col span={5}><Card><Statistic title={t('admin_stats_customers')} value={stats.totalCustomers} /></Card></Col>
          <Col span={5}><Card><Statistic title={t('admin_opportunities')} value={stats.totalOpportunities} /></Card></Col>
          <Col span={5}><Card><Statistic title={t('admin_quotes')} value={stats.totalQuotes} /></Card></Col>
          <Col span={5}><Card><Statistic title={t('admin_stats_orders')} value={stats.totalOrders} /></Card></Col>
        </Row>
      )}
      <Alert type="info" title={t('admin_backup')} description={t('admin_backup_desc')} showIcon style={{ marginBottom: 16 }} />
      <Button type="primary" icon={<CloudServerOutlined />} onClick={handleBackup} loading={backing}>{t('admin_trigger_backup')}</Button>
    </div>
  );
};

const SystemSettings: React.FC = () => {
  const { t } = useLanguage();
  const [claimLimit, setClaimLimit] = useState(50);
  const [returnDays, setReturnDays] = useState(30);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => { try { const { data } = await api.get('/admin/settings'); setClaimLimit(Number(data.claim_limit) || 50); setReturnDays(Number(data.auto_return_days) || 30); } catch { /* 使用默认值 */ } };
  const handleSave = async () => { setSaving(true); try { await api.put('/admin/settings', { claim_limit: String(claimLimit), auto_return_days: String(returnDays) }); message.success(t('admin_settings_saved')); } catch { message.error(t('error')); } setSaving(false); };
  useEffect(() => { fetchSettings(); }, []);

  return (
    <div>
      <Title level={5}>{t('cust_tab_public')}</Title>
      <Space orientation="vertical" style={{ width: '100%', maxWidth: 400 }}>
        <div><Text type="secondary">{t('cust_claim_limit')}</Text><InputNumber value={claimLimit} onChange={v => setClaimLimit(v || 50)} min={1} max={200} style={{ marginTop: 4, width: '100%' }} /></div>
        <div><Text type="secondary">{t('admin_auto_return_days')}</Text><InputNumber value={returnDays} onChange={v => setReturnDays(v || 30)} min={1} max={90} style={{ marginTop: 4, width: '100%' }} /></div>
        <Button type="primary" style={{ marginTop: 16 }} onClick={handleSave} loading={saving}>{t('admin_save_settings')}</Button>
      </Space>
    </div>
  );
};

export default AdminPanel;
