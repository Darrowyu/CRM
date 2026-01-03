import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Switch, Space, Tag, Popconfirm, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, MailOutlined } from '@ant-design/icons';
import { useLanguage } from '../../contexts/LanguageContext';
import * as adminService from '../../services/adminService';
import type { MessageTemplate } from '../../types/admin';

const TemplateManager: React.FC = () => {
  const { t } = useLanguage();
  const TYPE_OPTIONS = [ // 模板类型选项
    { value: 'email', label: t('template_type_email'), color: 'blue' },
    { value: 'sms', label: t('template_type_sms'), color: 'green' },
    { value: 'notification', label: t('template_type_notification'), color: 'orange' },
  ];
  const { message } = App.useApp();
  const [data, setData] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [filterType, setFilterType] = useState<string>();
  const [form] = Form.useForm();

  const fetch = async () => { // 获取数据
    setLoading(true);
    try { setData(await adminService.getTemplates(filterType)); } catch { message.error(t('error')); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [filterType]);

  const handleSubmit = async (values: any) => { // 提交表单
    try {
      if (editing) await adminService.updateTemplate(editing.id, values);
      else await adminService.createTemplate(values);
      message.success(t('success'));
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetch();
    } catch { message.error(t('error')); }
  };

  const handleDelete = async (id: string) => { // 删除
    try { await adminService.deleteTemplate(id); message.success(t('success')); fetch(); } catch { message.error(t('error')); }
  };

  const openEdit = (item: MessageTemplate) => { setEditing(item); form.setFieldsValue(item); setModalOpen(true); };

  const columns = [
    { title: t('template_name'), dataIndex: 'name' },
    { title: t('template_type'), dataIndex: 'type', width: 100, render: (v: string) => { const o = TYPE_OPTIONS.find(tp => tp.value === v); return <Tag color={o?.color}>{o?.label}</Tag>; }},
    { title: t('template_subject'), dataIndex: 'subject', ellipsis: true },
    { title: t('template_variables'), dataIndex: 'variables', render: (v: string[]) => v?.length ? v.map(x => <Tag key={x} style={{ marginBottom: 2 }}>{`{{${x}}}`}</Tag>) : '-' },
    { title: t('template_status'), dataIndex: 'is_active', width: 80, render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? t('template_enabled') : t('template_disabled')}</Tag> },
    { title: t('actions'), key: 'actions', width: 100, render: (_: any, r: MessageTemplate) => (
      <Space>
        <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} />
        <Popconfirm title={t('msg_confirm_delete')} onConfirm={() => handleDelete(r.id)}><Button type="text" danger icon={<DeleteOutlined />} size="small" /></Popconfirm>
      </Space>
    )},
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space><MailOutlined style={{ fontSize: 18 }} /><span style={{ fontWeight: 500 }}>{t('template_title')}</span></Space>
        <Space>
          <Select placeholder={t('template_filter_type')} allowClear style={{ width: 120 }} options={TYPE_OPTIONS} value={filterType} onChange={setFilterType} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>{t('template_add')}</Button>
        </Space>
      </div>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 10 }} />
      <Modal title={editing ? t('template_edit') : t('template_add')} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText={t('save')} cancelText={t('cancel')} width={600}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label={t('template_name')} rules={[{ required: true }]}><Input placeholder={t('template_name_placeholder')} /></Form.Item>
          <Form.Item name="type" label={t('template_type')} rules={[{ required: true }]}><Select options={TYPE_OPTIONS} /></Form.Item>
          <Form.Item name="subject" label={t('template_subject')}><Input placeholder={t('template_subject_placeholder')} /></Form.Item>
          <Form.Item name="content" label={t('template_content')} rules={[{ required: true }]} extra={t('template_content_hint')}><Input.TextArea rows={5} placeholder={t('template_content_placeholder')} /></Form.Item>
          <Form.Item name="variables" label={t('template_variables')}><Select mode="tags" placeholder={t('template_variables_placeholder')} /></Form.Item>
          <Form.Item name="is_active" label={t('template_enabled')} valuePropName="checked" initialValue={true}><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TemplateManager;
