import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Switch, Space, Tag, Popconfirm, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useLanguage } from '../../contexts/LanguageContext';
import * as adminService from '../../services/adminService';
import type { Dictionary } from '../../types/admin';

const DictionaryManager: React.FC = () => {
  const { t } = useLanguage();
  const DICT_TYPES = [
    { value: 'customer_source', label: t('dict_customer_source') },
    { value: 'industry', label: t('dict_industry') },
    { value: 'opportunity_stage', label: t('dict_opportunity_stage') },
    { value: 'payment_method', label: t('dict_payment_method') },
    { value: 'contract_type', label: t('dict_contract_type') },
  ];
  const { message } = App.useApp();
  const [data, setData] = useState<Dictionary[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Dictionary | null>(null);
  const [filterType, setFilterType] = useState<string>();
  const [form] = Form.useForm();

  const fetch = async () => { // 获取数据
    setLoading(true);
    try { setData(await adminService.getDictionaries(filterType)); } catch { message.error(t('error')); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [filterType]);

  const handleSubmit = async (values: any) => { // 提交表单
    try {
      if (editing) await adminService.updateDictionary(editing.id, values);
      else await adminService.createDictionary(values);
      message.success(t('success'));
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetch();
    } catch { message.error(t('error')); }
  };

  const handleDelete = async (id: string) => { // 删除
    try { await adminService.deleteDictionary(id); message.success(t('success')); fetch(); } catch { message.error(t('error')); }
  };

  const openEdit = (item: Dictionary) => { setEditing(item); form.setFieldsValue(item); setModalOpen(true); };

  const columns = [
    { title: t('dict_type'), dataIndex: 'type', render: (v: string) => <Tag>{DICT_TYPES.find(dt => dt.value === v)?.label || v}</Tag> },
    { title: t('dict_code'), dataIndex: 'code' },
    { title: t('dict_label'), dataIndex: 'label' },
    { title: t('dict_sort'), dataIndex: 'sort_order', width: 80 },
    { title: t('cust_status'), dataIndex: 'enabled', width: 80, render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? t('field_enabled') : t('field_disabled')}</Tag> },
    { title: t('actions'), key: 'actions', width: 120, render: (_: any, r: Dictionary) => (
      <Space>
        <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} />
        <Popconfirm title={t('msg_confirm_delete')} onConfirm={() => handleDelete(r.id)}><Button type="text" danger icon={<DeleteOutlined />} size="small" /></Popconfirm>
      </Space>
    )},
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Select placeholder={t('dict_filter_type')} allowClear style={{ width: 200 }} options={DICT_TYPES} value={filterType} onChange={setFilterType} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>{t('dict_add')}</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 15 }} />
      <Modal title={editing ? t('dict_edit') : t('dict_add')} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText={t('save')} cancelText={t('cancel')}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="type" label={t('dict_type')} rules={[{ required: true }]}><Select options={DICT_TYPES} disabled={!!editing} /></Form.Item>
          <Form.Item name="code" label={t('dict_code')} rules={[{ required: true }]}><Input disabled={!!editing} /></Form.Item>
          <Form.Item name="label" label={t('dict_label')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="sort_order" label={t('dict_sort')} initialValue={0}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="enabled" label={t('field_enabled')} valuePropName="checked" initialValue={true}><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DictionaryManager;
