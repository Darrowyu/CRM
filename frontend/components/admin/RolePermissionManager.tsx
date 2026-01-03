import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Space, Tag, Popconfirm, Checkbox, Card, Row, Col, Typography, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SafetyOutlined, LockOutlined } from '@ant-design/icons';
import { useLanguage } from '../../contexts/LanguageContext';
import * as adminService from '../../services/adminService';
import type { Role, Permission } from '../../types/admin';

const { Text } = Typography;

const RolePermissionManager: React.FC = () => {
  const { t } = useLanguage();
  const { message } = App.useApp();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [form] = Form.useForm();

  const fetch = async () => { // 获取数据
    setLoading(true);
    try {
      const [r, p] = await Promise.all([adminService.getRoles(), adminService.getPermissions()]);
      setRoles(r);
      setPermissions(p);
    } catch { message.error(t('error')); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (values: any) => { // 提交角色
    try {
      if (editing) await adminService.updateRole(editing.id, values);
      else await adminService.createRole(values);
      message.success(t('success'));
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetch();
    } catch { message.error(t('error')); }
  };

  const handleDelete = async (id: string) => { // 删除角色
    try { await adminService.deleteRole(id); message.success(t('success')); fetch(); } catch { message.error(t('error')); }
  };

  const openPermissions = async (role: Role) => { // 打开权限配置
    setEditing(role);
    try {
      const perms = await adminService.getRolePermissions(role.id);
      setSelectedPerms(perms.map(p => p.id));
      setPermModalOpen(true);
    } catch { message.error(t('error')); }
  };

  const handleSavePermissions = async () => { // 保存权限
    if (!editing) return;
    try {
      await adminService.updateRolePermissions(editing.id, selectedPerms);
      message.success(t('success'));
      setPermModalOpen(false);
    } catch { message.error(t('error')); }
  };

  const groupedPerms = permissions.reduce((acc, p) => { // 按模块分组权限
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);

  const columns = [
    { title: t('role_name'), dataIndex: 'name' },
    { title: t('role_display_name'), dataIndex: 'display_name' },
    { title: t('role_description'), dataIndex: 'description', ellipsis: true },
    { title: t('role_type'), dataIndex: 'is_system', width: 100, render: (v: boolean) => <Tag color={v ? 'purple' : 'blue'}>{v ? t('role_system') : t('role_custom')}</Tag> },
    { title: t('actions'), key: 'actions', width: 150, render: (_: any, r: Role) => (
      <Space>
        <Button type="text" icon={<LockOutlined />} size="small" onClick={() => openPermissions(r)}>{t('role_permissions')}</Button>
        {!r.is_system && <>
          <Button type="text" icon={<EditOutlined />} size="small" onClick={() => { setEditing(r); form.setFieldsValue(r); setModalOpen(true); }} />
          <Popconfirm title={t('msg_confirm_delete')} onConfirm={() => handleDelete(r.id)}><Button type="text" danger icon={<DeleteOutlined />} size="small" /></Popconfirm>
        </>}
      </Space>
    )},
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space><SafetyOutlined style={{ fontSize: 18 }} /><span style={{ fontWeight: 500 }}>{t('role_title')}</span></Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>{t('role_add')}</Button>
      </div>
      <Table dataSource={roles} columns={columns} rowKey="id" loading={loading} size="small" pagination={false} />
      
      <Modal title={editing ? t('role_edit') : t('role_add')} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText={t('save')} cancelText={t('cancel')}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label={t('role_name')} rules={[{ required: true }]}><Input placeholder={t('role_name_placeholder')} disabled={!!editing} /></Form.Item>
          <Form.Item name="display_name" label={t('role_display_name')} rules={[{ required: true }]}><Input placeholder={t('role_display_placeholder')} /></Form.Item>
          <Form.Item name="description" label={t('role_description')}><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal title={`${t('role_config_perm')} - ${editing?.display_name}`} open={permModalOpen} onCancel={() => setPermModalOpen(false)} onOk={handleSavePermissions} okText={t('save')} cancelText={t('cancel')} width={700}>
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          {Object.entries(groupedPerms).map(([module, perms]) => (
            <Card key={module} size="small" title={<Text strong>{module.toUpperCase()}</Text>} style={{ marginBottom: 12 }}>
              <Checkbox.Group value={selectedPerms} onChange={v => setSelectedPerms(v as string[])}>
                <Row gutter={[8, 8]}>
                  {perms.map(p => (
                    <Col span={12} key={p.id}><Checkbox value={p.id}>{p.name}</Checkbox></Col>
                  ))}
                </Row>
              </Checkbox.Group>
            </Card>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default RolePermissionManager;
