import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Space, Popconfirm, Tree, Card, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ApartmentOutlined } from '@ant-design/icons';
import { useLanguage } from '../../contexts/LanguageContext';
import * as adminService from '../../services/adminService';
import type { Department } from '../../types/admin';
import api from '../../services/api';

const DepartmentManager: React.FC = () => {
  const { t } = useLanguage();
  const { message } = App.useApp();
  const [data, setData] = useState<Department[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form] = Form.useForm();

  const fetch = async () => { // 获取数据
    setLoading(true);
    try {
      const [depts, usersRes] = await Promise.all([adminService.getDepartments(), api.get('/admin/users')]);
      setData(depts);
      setUsers(usersRes.data);
    } catch { message.error(t('error')); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (values: any) => { // 提交表单
    try {
      if (editing) await adminService.updateDepartment(editing.id, values);
      else await adminService.createDepartment(values);
      message.success(t('success'));
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetch();
    } catch { message.error(t('error')); }
  };

  const handleDelete = async (id: string) => { // 删除
    try { await adminService.deleteDepartment(id); message.success(t('success')); fetch(); } catch (e: any) { message.error(e.response?.data?.message || t('error')); }
  };

  const openEdit = (item: Department) => { setEditing(item); form.setFieldsValue(item); setModalOpen(true); };

  // 构建树形数据
  const buildTree = (items: Department[], parentId?: string): any[] => {
    return items.filter(i => i.parent_id === parentId).map(i => ({
      key: i.id, title: `${i.name}${i.manager_name ? ` (${i.manager_name})` : ''}`, children: buildTree(items, i.id), data: i
    }));
  };

  const treeData = buildTree(data, undefined);

  const columns = [
    { title: t('dept_name'), dataIndex: 'name' },
    { title: t('dept_parent'), dataIndex: 'parent_id', render: (v: string) => data.find(d => d.id === v)?.name || '-' },
    { title: t('dept_manager'), dataIndex: 'manager_name', render: (v: string) => v || '-' },
    { title: t('dept_sort'), dataIndex: 'sort_order', width: 80 },
    { title: t('actions'), key: 'actions', width: 120, render: (_: any, r: Department) => (
      <Space>
        <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} />
        <Popconfirm title={t('msg_confirm_delete')} onConfirm={() => handleDelete(r.id)}><Button type="text" danger icon={<DeleteOutlined />} size="small" /></Popconfirm>
      </Space>
    )},
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space><ApartmentOutlined style={{ fontSize: 18 }} /><span style={{ fontWeight: 500 }}>{t('admin_department')}</span></Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>{t('dept_add')}</Button>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <Card title={t('dept_structure')} size="small" style={{ width: 280 }}>
          {treeData.length > 0 ? <Tree treeData={treeData} defaultExpandAll showLine /> : <span style={{ color: '#999' }}>{t('dept_none')}</span>}
        </Card>
        <div style={{ flex: 1 }}>
          <Table dataSource={data} columns={columns} rowKey="id" loading={loading} size="small" pagination={false} />
        </div>
      </div>
      <Modal title={editing ? t('dept_edit') : t('dept_add')} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText={t('save')} cancelText={t('cancel')}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label={t('dept_name')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="parent_id" label={t('dept_parent')}><Select options={data.filter(d => d.id !== editing?.id).map(d => ({ value: d.id, label: d.name }))} allowClear placeholder={t('dept_no_parent')} /></Form.Item>
          <Form.Item name="manager_id" label={t('dept_manager')}><Select options={users.map(u => ({ value: u.id, label: u.name }))} allowClear /></Form.Item>
          <Form.Item name="sort_order" label={t('dept_sort')} initialValue={0}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DepartmentManager;
