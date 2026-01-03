import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, Tag, Popconfirm, Upload, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, GlobalOutlined, UploadOutlined, DownloadOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { useLanguage } from '../../contexts/LanguageContext';
import * as adminService from '../../services/adminService';
import type { Translation } from '../../types/admin';
import { en } from '../../i18n/en';
import { zh } from '../../i18n/zh';

const LOCALE_OPTIONS = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁体中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
];

const TranslationManager: React.FC = () => {
  const { t } = useLanguage();
  const { message } = App.useApp();
  const [data, setData] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Translation | null>(null);
  const [filterLocale, setFilterLocale] = useState<string>();
  const [searchKey, setSearchKey] = useState('');
  const [form] = Form.useForm();
  const [keysModalOpen, setKeysModalOpen] = useState(false); // 键名参考表弹窗
  const [keysSearch, setKeysSearch] = useState('');

  const staticKeys = Object.entries(en).map(([key, enValue]) => ({ key, en: enValue, zh: zh[key as keyof typeof zh] || '' })); // 静态翻译键名列表
  const filteredKeys = keysSearch ? staticKeys.filter(k => k.key.includes(keysSearch) || k.en.includes(keysSearch) || k.zh.includes(keysSearch)) : staticKeys;

  const fetch = async () => { // 获取数据
    setLoading(true);
    try { setData(await adminService.getTranslations(filterLocale)); } catch { message.error(t('error')); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [filterLocale]);

  const handleSubmit = async (values: any) => { // 提交表单
    try {
      if (editing) await adminService.updateTranslation(editing.id, values);
      else await adminService.createTranslation(values);
      message.success(t('success'));
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetch();
    } catch { message.error(t('error')); }
  };

  const handleDelete = async (id: string) => { // 删除
    try { await adminService.deleteTranslation(id); message.success(t('success')); fetch(); } catch { message.error(t('error')); }
  };

  const openEdit = (item: Translation) => { setEditing(item); form.setFieldsValue(item); setModalOpen(true); };

  const handleExport = () => { // 导出JSON
    const grouped = data.reduce((acc, t) => {
      if (!acc[t.locale]) acc[t.locale] = {};
      acc[t.locale][t.key] = t.value;
      return acc;
    }, {} as Record<string, Record<string, string>>);
    const blob = new Blob([JSON.stringify(grouped, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'translations.json';
    a.click();
  };

  const handleImport = async (file: File) => { // 导入JSON
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const translations: { key: string; locale: string; value: string }[] = [];
      Object.entries(json).forEach(([locale, keys]) => {
        Object.entries(keys as Record<string, string>).forEach(([key, value]) => {
          translations.push({ key, locale, value });
        });
      });
      await adminService.batchImportTranslations(translations);
      message.success(t('msg_import_success'));
      fetch();
    } catch { message.error(t('msg_import_error')); }
    return false;
  };

  const filteredData = searchKey ? data.filter(d => d.key.includes(searchKey) || d.value.includes(searchKey)) : data;

  const columns = [
    { title: t('admin_key_name'), dataIndex: 'key', ellipsis: true },
    { title: t('admin_filter_language'), dataIndex: 'locale', width: 100, render: (v: string) => <Tag>{LOCALE_OPTIONS.find(o => o.value === v)?.label || v}</Tag> },
    { title: t('field_value'), dataIndex: 'value', ellipsis: true },
    { title: t('field_updated_at'), dataIndex: 'updated_at', width: 160, render: (v: string) => new Date(v).toLocaleString() },
    { title: t('actions'), key: 'actions', width: 100, render: (_: any, r: Translation) => (
      <Space>
        <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} />
        <Popconfirm title={t('msg_confirm_delete')} onConfirm={() => handleDelete(r.id)}><Button type="text" danger icon={<DeleteOutlined />} size="small" /></Popconfirm>
      </Space>
    )},
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space><GlobalOutlined style={{ fontSize: 18 }} /><span style={{ fontWeight: 500 }}>{t('admin_translation')}</span></Space>
        <Space>
          <Input.Search placeholder={t('admin_search_key_or_value')} style={{ width: 200 }} onSearch={setSearchKey} allowClear />
          <Select placeholder={t('admin_filter_language')} allowClear style={{ width: 120 }} options={LOCALE_OPTIONS} value={filterLocale} onChange={setFilterLocale} />
          <Button icon={<UnorderedListOutlined />} onClick={() => setKeysModalOpen(true)}>{t('admin_view_keys')}</Button>
          <Upload beforeUpload={handleImport} showUploadList={false} accept=".json"><Button icon={<UploadOutlined />}>{t('import')}</Button></Upload>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>{t('export')}</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>{t('add')}</Button>
        </Space>
      </div>
      <Table dataSource={filteredData} columns={columns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 15 }} />
      <Modal title={editing ? t('edit') : t('add')} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText={t('save')} cancelText={t('cancel')}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="key" label={t('admin_key_name')} rules={[{ required: true }]}><Input placeholder="e.g. button_save" disabled={!!editing} /></Form.Item>
          <Form.Item name="locale" label={t('admin_filter_language')} rules={[{ required: true }]}><Select options={LOCALE_OPTIONS} disabled={!!editing} /></Form.Item>
          <Form.Item name="value" label={t('field_value')} rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
      <Modal title={t('admin_static_keys_ref')} open={keysModalOpen} onCancel={() => setKeysModalOpen(false)} footer={null} width={800}>
        <Input.Search placeholder={t('admin_search_key_or_value')} style={{ marginBottom: 12 }} onSearch={setKeysSearch} allowClear />
        <Table dataSource={filteredKeys} rowKey="key" size="small" pagination={{ pageSize: 10 }} columns={[
          { title: t('admin_key_name'), dataIndex: 'key', width: 200, render: (v: string) => <Tag color="blue" style={{ cursor: 'pointer' }} onClick={() => { navigator.clipboard.writeText(v); message.success(t('msg_copied')); }}>{v}</Tag> },
          { title: t('admin_english'), dataIndex: 'en', ellipsis: true },
          { title: t('admin_chinese'), dataIndex: 'zh', ellipsis: true },
        ]} />
      </Modal>
    </div>
  );
};

export default TranslationManager;
