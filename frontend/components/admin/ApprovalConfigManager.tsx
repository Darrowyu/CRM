import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Switch, Space, Tag, Popconfirm, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, AuditOutlined } from '@ant-design/icons';
import { useLanguage } from '../../contexts/LanguageContext';
import * as adminService from '../../services/adminService';
import type { ApprovalConfig } from '../../types/admin';
import api from '../../services/api';

const ApprovalConfigManager: React.FC = () => {
  const { t } = useLanguage();
  const TYPE_OPTIONS = [
    { value: 'quote', label: t('approval_type_quote') },
    { value: 'discount', label: t('approval_type_discount') },
    { value: 'contract', label: t('approval_type_contract') },
  ];
  const ROLE_OPTIONS = [
    { value: 'admin', label: t('role_admin') },
    { value: 'sales_manager', label: t('role_sales_manager') },
    { value: 'finance', label: t('role_finance') },
  ];
  const { message } = App.useApp();
  const [data, setData] = useState<ApprovalConfig[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApprovalConfig | null>(null);
  const [form] = Form.useForm();

  const fetch = async () => { // 获取数据
    setLoading(true);
    try {
      const [configs, usersRes] = await Promise.all([adminService.getApprovalConfigs(), api.get('/admin/users')]);
      setData(configs);
      setUsers(usersRes.data);
    } catch { message.error(t('error')); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (values: any) => { // 提交表单
    try {
      if (editing) await adminService.updateApprovalConfig(editing.id, values);
      else await adminService.createApprovalConfig(values);
      message.success(t('success'));
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetch();
    } catch { message.error(t('error')); }
  };

  const handleDelete = async (id: string) => { // 删除
    try { await adminService.deleteApprovalConfig(id); message.success(t('success')); fetch(); } catch { message.error(t('error')); }
  };

  const openEdit = (item: ApprovalConfig) => { setEditing(item); form.setFieldsValue(item); setModalOpen(true); };

  const columns = [
    { title: t('approval_name'), dataIndex: 'name' },
    { title: t('approval_type'), dataIndex: 'type', render: (v: string) => TYPE_OPTIONS.find(o => o.value === v)?.label || v },
    { title: t('approval_threshold'), dataIndex: 'threshold', render: (v: number) => v ? `≥ ¥${v.toLocaleString()}` : '-' },
    { title: t('approval_role'), dataIndex: 'approver_role', render: (v: string) => v ? <Tag>{ROLE_OPTIONS.find(o => o.value === v)?.label}</Tag> : '-' },
    { title: t('approval_user'), dataIndex: 'approver_name', render: (v: string) => v || '-' },
    { title: t('cust_status'), dataIndex: 'is_active', width: 80, render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? t('field_enabled') : t('field_disabled')}</Tag> },
    { title: t('actions'), key: 'actions', width: 100, render: (_: any, r: ApprovalConfig) => (
      <Space>
        <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} />
        <Popconfirm title={t('msg_confirm_delete')} onConfirm={() => handleDelete(r.id)}><Button type="text" danger icon={<DeleteOutlined />} size="small" /></Popconfirm>
      </Space>
    )},
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space><AuditOutlined style={{ fontSize: 18 }} /><span style={{ fontWeight: 500 }}>{t('admin_approval_flow')}</span></Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>{t('approval_add')}</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} size="small" pagination={false} />
      <Modal title={editing ? t('approval_edit') : t('approval_add')} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText={t('save')} cancelText={t('cancel')}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label={t('approval_name')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label={t('approval_type')} rules={[{ required: true }]}><Select options={TYPE_OPTIONS} /></Form.Item>
          <Form.Item name="threshold" label={t('approval_threshold')}><InputNumber min={0} style={{ width: '100%' }} prefix="¥" /></Form.Item>
          <Form.Item name="approver_role" label={t('approval_role')}><Select options={ROLE_OPTIONS} allowClear /></Form.Item>
          <Form.Item name="approver_id" label={t('approval_user')}><Select options={users.map(u => ({ value: u.id, label: u.name }))} allowClear /></Form.Item>
          <Form.Item name="is_active" label={t('field_enabled')} valuePropName="checked" initialValue={true}><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ApprovalConfigManager;
