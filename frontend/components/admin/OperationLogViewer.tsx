import React, { useState, useEffect } from 'react';
import { Table, Select, DatePicker, Space, Tag, Card, Button, Row, Col, App } from 'antd';
import { HistoryOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useLanguage } from '../../contexts/LanguageContext';
import * as adminService from '../../services/adminService';
import type { OperationLog } from '../../types/admin';
import api from '../../services/api';
import dayjs from 'dayjs';

const PIE_COLORS = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96'];

const OperationLogViewer: React.FC = () => {
  const { t } = useLanguage();
  const MODULE_OPTIONS = [ // 模块选项
    { value: 'customer', label: t('log_module_customer') },
    { value: 'opportunity', label: t('log_module_opportunity') },
    { value: 'quote', label: t('log_module_quote') },
    { value: 'order', label: t('log_module_order') },
    { value: 'contract', label: t('log_module_contract') },
    { value: 'user', label: t('log_module_user') },
    { value: 'system', label: t('log_module_system') },
  ];
  const ACTION_OPTIONS = [ // 操作选项
    { value: 'create', label: t('log_action_create'), color: 'green' },
    { value: 'update', label: t('log_action_update'), color: 'blue' },
    { value: 'delete', label: t('log_action_delete'), color: 'red' },
    { value: 'login', label: t('log_action_login'), color: 'purple' },
    { value: 'export', label: t('log_action_export'), color: 'orange' },
  ];
  const { message } = App.useApp();
  const [data, setData] = useState<OperationLog[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [stats, setStats] = useState<{ byModule: { module: string; count: number }[]; byAction: { action: string; count: number }[]; byDay: { date: string; count: number }[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState<{ module?: string; action?: string; user_id?: string; dateRange?: [dayjs.Dayjs, dayjs.Dayjs] }>({});

  const fetch = async () => { // 获取数据
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.module) params.module = filters.module;
      if (filters.action) params.action = filters.action;
      if (filters.user_id) params.user_id = filters.user_id;
      if (filters.dateRange) { params.start_date = filters.dateRange[0].format('YYYY-MM-DD'); params.end_date = filters.dateRange[1].format('YYYY-MM-DD'); }
      const [logs, usersRes, statsData] = await Promise.all([adminService.getOperationLogs(params), api.get('/admin/users'), adminService.getLogStats()]);
      setData(logs); setUsers(usersRes.data); setStats(statsData);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleExport = async () => { // 导出日志
    setExporting(true);
    try {
      const params: { start_date?: string; end_date?: string } = {};
      if (filters.dateRange) { params.start_date = filters.dateRange[0].format('YYYY-MM-DD'); params.end_date = filters.dateRange[1].format('YYYY-MM-DD'); }
      const result = await adminService.exportLogs(params);
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `operation_logs_${dayjs().format('YYYY-MM-DD')}.json`; a.click();
      URL.revokeObjectURL(url);
      message.success(t('log_export_success').replace('{count}', result.count));
    } catch { message.error(t('error')); }
    setExporting(false);
  };

  const columns = [
    { title: t('log_time'), dataIndex: 'created_at', width: 160, render: (v: string) => new Date(v).toLocaleString() },
    { title: t('log_operator'), dataIndex: 'operator_name', width: 100 },
    { title: t('log_module'), dataIndex: 'module', width: 80, render: (v: string) => <Tag>{MODULE_OPTIONS.find(o => o.value === v)?.label || v}</Tag> },
    { title: t('log_action'), dataIndex: 'action', width: 80, render: (v: string) => { const o = ACTION_OPTIONS.find(a => a.value === v); return <Tag color={o?.color}>{o?.label || v}</Tag>; }},
    { title: t('log_target_type'), dataIndex: 'target_type', width: 100 },
    { title: t('log_detail'), dataIndex: 'detail', ellipsis: true, render: (v: any) => v ? JSON.stringify(v) : '-' },
    { title: t('log_ip'), dataIndex: 'ip_address', width: 120 },
  ];

  const moduleData = stats?.byModule.map(m => ({ name: MODULE_OPTIONS.find(o => o.value === m.module)?.label || m.module, value: parseInt(String(m.count)) })) || [];
  const actionData = stats?.byAction.map(a => ({ name: ACTION_OPTIONS.find(o => o.value === a.action)?.label || a.action, value: parseInt(String(a.count)) })) || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space><HistoryOutlined style={{ fontSize: 18 }} /><span style={{ fontWeight: 500 }}>{t('log_title')}</span></Space>
        <Space><Button icon={<DownloadOutlined />} onClick={handleExport} loading={exporting}>{t('log_export')}</Button><Button icon={<ReloadOutlined />} onClick={fetch} loading={loading}>{t('refresh')}</Button></Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card title={t('log_7day_trend')} size="small">
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={stats?.byDay || []}><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Bar dataKey="count" fill="#1890ff" name={t('log_op_count')} /></BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={8}>
          <Card title={t('log_by_module')} size="small">
            <ResponsiveContainer width="100%" height={150}>
              <PieChart><Pie data={moduleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} label={({ name }) => name}>
                {moduleData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={8}>
          <Card title={t('log_by_action')} size="small">
            <ResponsiveContainer width="100%" height={150}>
              <PieChart><Pie data={actionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} label={({ name }) => name}>
                {actionData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select placeholder={t('log_filter_module')} allowClear style={{ width: 120 }} options={MODULE_OPTIONS} value={filters.module} onChange={v => setFilters({ ...filters, module: v })} />
          <Select placeholder={t('log_filter_action')} allowClear style={{ width: 120 }} options={ACTION_OPTIONS} value={filters.action} onChange={v => setFilters({ ...filters, action: v })} />
          <Select placeholder={t('log_filter_operator')} allowClear style={{ width: 120 }} options={users.map(u => ({ value: u.id, label: u.name }))} value={filters.user_id} onChange={v => setFilters({ ...filters, user_id: v })} />
          <DatePicker.RangePicker value={filters.dateRange} onChange={v => setFilters({ ...filters, dateRange: v as [dayjs.Dayjs, dayjs.Dayjs] })} />
          <Button type="primary" onClick={fetch}>{t('log_query')}</Button>
        </Space>
      </Card>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20 }} scroll={{ x: 900 }} />
    </div>
  );
};

export default OperationLogViewer;
