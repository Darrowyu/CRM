import React, { useState, useEffect } from 'react';
import { Card, Table, Row, Col, Statistic, Tag, Progress, Button, Space, App } from 'antd';
import { ReloadOutlined, DashboardOutlined, DatabaseOutlined, ClockCircleOutlined, ApiOutlined } from '@ant-design/icons';
import { useLanguage } from '../../contexts/LanguageContext';
import * as adminService from '../../services/adminService';
import type { ApiStat, SystemHealth } from '../../types/admin';

const SystemMonitor: React.FC = () => {
  const { t } = useLanguage();
  const { message } = App.useApp();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [apiStats, setApiStats] = useState<ApiStat[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = async () => { // 获取数据
    setLoading(true);
    try {
      const [h, s] = await Promise.all([adminService.getSystemHealth(), adminService.getApiStats()]);
      setHealth(h);
      setApiStats(s);
    } catch { message.error(t('error')); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const formatBytes = (bytes: number) => { // 格式化字节
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatUptime = (seconds: number) => { // 格式化运行时间
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}${t('monitor_hours')}${m}${t('monitor_minutes')}`;
  };

  const columns = [
    { title: t('monitor_endpoint'), dataIndex: 'endpoint', ellipsis: true },
    { title: t('monitor_method'), dataIndex: 'method', width: 80, render: (v: string) => <Tag color={v === 'GET' ? 'blue' : v === 'POST' ? 'green' : 'orange'}>{v}</Tag> },
    { title: t('monitor_call_count'), dataIndex: 'count', width: 100, sorter: (a: ApiStat, b: ApiStat) => a.count - b.count },
    { title: t('monitor_avg_time'), dataIndex: 'avg_time', width: 100, render: (v: number) => `${v || 0}ms` },
    { title: t('monitor_error_count'), dataIndex: 'error_count', width: 80, render: (v: number) => v > 0 ? <Tag color="red">{v}</Tag> : <Tag color="green">0</Tag> },
    { title: t('monitor_success_rate'), key: 'rate', width: 120, render: (_: any, r: ApiStat) => {
      const rate = r.count > 0 ? ((r.count - r.error_count) / r.count * 100) : 100;
      return <Progress percent={Math.round(rate)} size="small" status={rate < 90 ? 'exception' : 'success'} />;
    }},
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space><DashboardOutlined style={{ fontSize: 18 }} /><span style={{ fontWeight: 500 }}>{t('monitor_title')}</span></Space>
        <Button icon={<ReloadOutlined />} onClick={fetch} loading={loading}>{t('refresh')}</Button>
      </div>

      {health && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic title={t('monitor_db_status')} value={health.database.status === 'healthy' ? t('monitor_db_healthy') : t('monitor_db_error')} 
                prefix={<DatabaseOutlined style={{ color: health.database.status === 'healthy' ? '#52c41a' : '#ff4d4f' }} />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title={t('monitor_uptime')} value={formatUptime(health.uptime)} prefix={<ClockCircleOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title={t('monitor_heap_memory')} value={formatBytes(health.memory?.heapUsed || 0)} 
                suffix={`/ ${formatBytes(health.memory?.heapTotal || 0)}`} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title={t('monitor_rss_memory')} value={formatBytes(health.memory?.rss || 0)} />
            </Card>
          </Col>
        </Row>
      )}

      {health?.tables && (
        <Card title={t('monitor_table_stats')} size="small" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 8]}>
            {health.tables.map(tb => (
              <Col span={6} key={tb.table_name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: '#fafafa', borderRadius: 4 }}>
                  <span>{tb.table_name}</span>
                  <Tag>{tb.row_count.toLocaleString()} {t('monitor_rows')}</Tag>
                </div>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      <Card title={<Space><ApiOutlined />{t('monitor_api_stats')}</Space>} size="small">
        <Table dataSource={apiStats} columns={columns} rowKey="endpoint" size="small" pagination={{ pageSize: 10 }} loading={loading} />
      </Card>
    </div>
  );
};

export default SystemMonitor;
