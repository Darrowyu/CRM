import React, { useState, useEffect } from 'react';
import { Card, Table, Row, Col, Statistic, Form, InputNumber, Input, Button, Space, Tag, App } from 'antd';
import { SafetyOutlined, UserOutlined, LockOutlined, GlobalOutlined, ReloadOutlined } from '@ant-design/icons';
import { useLanguage } from '../../contexts/LanguageContext';
import * as adminService from '../../services/adminService';

interface Session { user_id: string; name: string; username: string; ip_address: string; last_login: string; }
interface SecurityConfig { password_min_length: string; session_timeout: string; max_login_attempts: string; ip_whitelist: string; }

const SecurityCenter: React.FC = () => {
  const { t } = useLanguage();
  const { message } = App.useApp();
  const [sessions, setSessions] = useState<(Session & { _key: string })[]>([]);
  const [config, setConfig] = useState<SecurityConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetch = async () => {
    setLoading(true);
    try {
      const [sess, cfg] = await Promise.all([adminService.getActiveSessions(), adminService.getSecurityConfig()]);
      setSessions(sess.map((s: Session, i: number) => ({ ...s, _key: `${s.user_id}_${i}` }))); setConfig(cfg); form.setFieldsValue(cfg);
    } catch { message.error(t('error')); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleSave = async (values: SecurityConfig) => {
    setSaving(true);
    try { await adminService.updateSecurityConfig(values); message.success(t('security_saved')); }
    catch { message.error(t('error')); }
    setSaving(false);
  };

  const sessionColumns = [
    { title: t('security_user'), dataIndex: 'name', render: (v: string, r: Session) => <span><UserOutlined style={{ marginRight: 8 }} />{v} ({r.username})</span> },
    { title: t('log_ip'), dataIndex: 'ip_address', render: (v: string) => <Tag>{v || t('security_unknown')}</Tag> },
    { title: t('profile_login_time'), dataIndex: 'last_login', render: (v: string) => new Date(v).toLocaleString() },
    { title: t('security_status'), key: 'status', width: 80, render: () => <Tag color="green">{t('security_online')}</Tag> }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space><SafetyOutlined style={{ fontSize: 18 }} /><span style={{ fontWeight: 500 }}>{t('security_title')}</span></Space>
        <Button icon={<ReloadOutlined />} onClick={fetch} loading={loading}>{t('refresh')}</Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title={t('security_active_sessions')} value={sessions.length} prefix={<UserOutlined />} styles={{ content: { color: '#52c41a' } }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title={t('security_password_min')} value={config?.password_min_length || 8} suffix={t('security_digits')} prefix={<LockOutlined />} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title={t('security_session_timeout')} value={config?.session_timeout || 480} suffix={t('security_minutes')} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title={t('security_max_attempts')} value={config?.max_login_attempts || 5} suffix={t('security_times')} /></Card></Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title={t('security_sessions_24h')} size="small">
            <Table dataSource={sessions} columns={sessionColumns} rowKey="_key" size="small" pagination={false} loading={loading} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title={t('security_policy')} size="small">
            <Form form={form} layout="vertical" onFinish={handleSave}>
              <Form.Item name="password_min_length" label={t('security_password_min_label')}><InputNumber min={6} max={20} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="session_timeout" label={t('security_timeout_label')}><InputNumber min={30} max={1440} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="max_login_attempts" label={t('security_max_attempts_label')}><InputNumber min={3} max={10} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="ip_whitelist" label={<span><GlobalOutlined /> {t('security_ip_whitelist')}</span>}><Input.TextArea rows={3} placeholder={t('security_ip_hint')} /></Form.Item>
              <Button type="primary" htmlType="submit" loading={saving}>{t('security_save')}</Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SecurityCenter;
