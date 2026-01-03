import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, InputNumber, Switch, Space, Tag, Popconfirm, DatePicker, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, NotificationOutlined } from '@ant-design/icons';
import { useLanguage } from '../../contexts/LanguageContext';
import * as adminService from '../../services/adminService';
import type { Announcement } from '../../types/admin';
import dayjs from 'dayjs';

const AnnouncementManager: React.FC = () => {
  const { t } = useLanguage();
  const TYPE_OPTIONS = [
    { value: 'info', label: t('announce_type_info'), color: 'blue' },
    { value: 'warning', label: t('announce_type_warning'), color: 'orange' },
    { value: 'success', label: t('announce_type_success'), color: 'green' },
    { value: 'error', label: t('announce_type_error'), color: 'red' },
  ];
  const { message } = App.useApp();
  const [data, setData] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form] = Form.useForm();

  const fetch = async () => { // 获取数据
    setLoading(true);
    try { setData(await adminService.getAnnouncements()); } catch { message.error(t('error')); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (values: any) => { // 提交表单
    try {
      const payload = { ...values, start_time: values.start_time?.toISOString(), end_time: values.end_time?.toISOString() };
      if (editing) await adminService.updateAnnouncement(editing.id, payload);
      else await adminService.createAnnouncement(payload);
      message.success(t('success'));
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetch();
    } catch { message.error(t('error')); }
  };

  const handleDelete = async (id: string) => { // 删除
    try { await adminService.deleteAnnouncement(id); message.success(t('success')); fetch(); } catch { message.error(t('error')); }
  };

  const openEdit = (item: Announcement) => {
    setEditing(item);
    form.setFieldsValue({ ...item, start_time: item.start_time ? dayjs(item.start_time) : null, end_time: item.end_time ? dayjs(item.end_time) : null });
    setModalOpen(true);
  };

  const columns = [
    { title: t('announce_title'), dataIndex: 'title', ellipsis: true },
    { title: t('announce_type'), dataIndex: 'type', width: 80, render: (v: string) => { const opt = TYPE_OPTIONS.find(o => o.value === v); return <Tag color={opt?.color}>{opt?.label}</Tag>; }},
    { title: t('announce_priority'), dataIndex: 'priority', width: 80 },
    { title: t('announce_status'), dataIndex: 'is_active', width: 80, render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? t('announce_enabled') : t('field_disabled')}</Tag> },
    { title: t('announce_creator'), dataIndex: 'creator_name', width: 100 },
    { title: t('field_created_at'), dataIndex: 'created_at', width: 160, render: (v: string) => new Date(v).toLocaleString() },
    { title: t('actions'), key: 'actions', width: 100, render: (_: any, r: Announcement) => (
      <Space>
        <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} />
        <Popconfirm title={t('msg_confirm_delete')} onConfirm={() => handleDelete(r.id)}><Button type="text" danger icon={<DeleteOutlined />} size="small" /></Popconfirm>
      </Space>
    )},
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space><NotificationOutlined style={{ fontSize: 18 }} /><span style={{ fontWeight: 500 }}>{t('admin_announcement')}</span></Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>{t('announce_publish')}</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 10 }} />
      <Modal title={editing ? t('announce_edit') : t('announce_publish')} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText={t('save')} cancelText={t('cancel')} width={600}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="title" label={t('announce_title')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="content" label={t('announce_content')} rules={[{ required: true }]}><Input.TextArea rows={4} /></Form.Item>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="type" label={t('announce_type')} initialValue="info"><Select options={TYPE_OPTIONS} /></Form.Item>
            <Form.Item name="priority" label={t('announce_priority')} initialValue={0}><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item>
          </Space>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="start_time" label={t('announce_start_time')}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="end_time" label={t('announce_end_time')}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
          </Space>
          <Form.Item name="is_active" label={t('announce_enable_now')} valuePropName="checked" initialValue={true}><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AnnouncementManager;
