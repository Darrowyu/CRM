import React, { useState, useEffect } from 'react';
import { Table, Button, InputNumber, Switch, Space, Tag, Popconfirm, Card, Alert, Typography, App } from 'antd';
import { DeleteOutlined, HistoryOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useLanguage } from '../../contexts/LanguageContext';
import * as adminService from '../../services/adminService';
import type { ArchiveConfig } from '../../types/admin';

const { Text } = Typography;

const DataArchiveManager: React.FC = () => {
  const { t } = useLanguage();
  const { message } = App.useApp();
  const [data, setData] = useState<ArchiveConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const fetch = async () => { // 获取数据
    setLoading(true);
    try { setData(await adminService.getArchiveConfigs()); } catch { message.error(t('error')); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleUpdate = async (id: string, field: string, value: any) => { // 更新配置
    try {
      await adminService.updateArchiveConfig(id, { [field]: value });
      message.success(t('success'));
      fetch();
    } catch { message.error(t('error')); }
  };

  const handleArchive = async () => { // 执行归档
    setArchiving(true);
    try {
      const result = await adminService.executeArchive();
      message.success(`${t('success')} (${result.results.reduce((s: number, r: any) => s + r.deleted, 0)})`);
      fetch();
    } catch { message.error(t('error')); }
    setArchiving(false);
  };

  const columns = [
    { title: t('archive_table'), dataIndex: 'table_name', render: (v: string) => <Text code>{v}</Text> },
    { title: t('archive_retention'), dataIndex: 'retention_days', width: 150, render: (v: number, r: ArchiveConfig) => (
      <InputNumber value={v} min={30} max={730} onChange={val => val && handleUpdate(r.id, 'retention_days', val)} style={{ width: 100 }} />
    )},
    { title: t('field_enabled'), dataIndex: 'is_enabled', width: 100, render: (v: boolean, r: ArchiveConfig) => (
      <Switch checked={v} onChange={val => handleUpdate(r.id, 'is_enabled', val)} />
    )},
    { title: t('archive_last'), dataIndex: 'last_archive_at', width: 180, render: (v: string) => v ? new Date(v).toLocaleString() : <Tag>{t('archive_never')}</Tag> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space><HistoryOutlined style={{ fontSize: 18 }} /><span style={{ fontWeight: 500 }}>{t('archive_title')}</span></Space>
        <Popconfirm title={t('archive_confirm')} icon={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />} onConfirm={handleArchive} okText={t('archive_confirm_btn')} cancelText={t('cancel')} okButtonProps={{ danger: true }}>
          <Button type="primary" danger icon={<DeleteOutlined />} loading={archiving}>{t('archive_execute')}</Button>
        </Popconfirm>
      </div>

      <Alert type="warning" showIcon style={{ marginBottom: 16 }} description={t('archive_desc')} />

      <Card size="small">
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} size="small" pagination={false} />
      </Card>
    </div>
  );
};

export default DataArchiveManager;
