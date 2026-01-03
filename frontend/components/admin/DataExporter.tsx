import React, { useState } from 'react';
import { Card, Button, Space, Row, Col, Statistic, Typography, App } from 'antd';
import { DownloadOutlined, UserOutlined, ShoppingOutlined, FileTextOutlined, DollarOutlined } from '@ant-design/icons';
import { useLanguage } from '../../contexts/LanguageContext';
import * as adminService from '../../services/adminService';

const { Text } = Typography;

const DataExporter: React.FC = () => {
  const { t } = useLanguage();
  const EXPORT_TYPES = [
    { key: 'customers', label: t('export_customers'), icon: <UserOutlined />, color: '#1890ff' },
    { key: 'opportunities', label: t('export_opportunities'), icon: <ShoppingOutlined />, color: '#52c41a' },
    { key: 'quotes', label: t('export_quotes'), icon: <FileTextOutlined />, color: '#faad14' },
    { key: 'orders', label: t('export_orders'), icon: <DollarOutlined />, color: '#722ed1' },
  ] as const;
  const { message } = App.useApp();
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { count: number; time: string }>>({});

  const handleExport = async (type: 'customers' | 'opportunities' | 'orders' | 'quotes') => { // 导出数据
    setLoading(type);
    try {
      const result = await adminService.exportData(type);
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setResults({ ...results, [type]: { count: result.count, time: new Date().toLocaleTimeString() } });
      message.success(`导出成功，共 ${result.count} 条记录`);
    } catch { message.error(t('error')); }
    setLoading(null);
  };

  const exportCSV = async (type: 'customers' | 'opportunities' | 'orders' | 'quotes') => { // 导出CSV
    setLoading(type + '_csv');
    try {
      const result = await adminService.exportData(type);
      if (!result.data.length) { message.warning(t('export_no_data')); setLoading(null); return; }
      const headers = Object.keys(result.data[0]);
      const csv = [headers.join(','), ...result.data.map((row: any) => headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      message.success(`CSV导出成功，共 ${result.count} 条记录`);
    } catch { message.error(t('error')); }
    setLoading(null);
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space><DownloadOutlined style={{ fontSize: 18 }} /><span style={{ fontWeight: 500 }}>{t('admin_data_export')}</span></Space>
        <Text type="secondary" style={{ marginLeft: 16 }}>JSON / CSV</Text>
      </div>
      <Row gutter={16}>
        {EXPORT_TYPES.map(item => (
          <Col span={6} key={item.key}>
            <Card hoverable style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, color: item.color, marginBottom: 16 }}>{item.icon}</div>
              <Statistic title={item.label} value={results[item.key]?.count ?? '-'} suffix={results[item.key] ? t('export_records') : ''} />
              {results[item.key] && <Text type="secondary" style={{ fontSize: 12 }}>{t('export_at')} {results[item.key].time}</Text>}
              <div style={{ marginTop: 16 }}>
                <Space>
                  <Button type="primary" size="small" loading={loading === item.key} onClick={() => handleExport(item.key)}>JSON</Button>
                  <Button size="small" loading={loading === item.key + '_csv'} onClick={() => exportCSV(item.key)}>CSV</Button>
                </Space>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default DataExporter;
