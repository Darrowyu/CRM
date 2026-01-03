import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Select, Button, Row, Col, Tabs, Space, App } from 'antd';
import { MailOutlined, MessageOutlined, CloudOutlined, SettingOutlined, SaveOutlined } from '@ant-design/icons';
import { useLanguage } from '../../contexts/LanguageContext';
import * as adminService from '../../services/adminService';

const SystemConfigManager: React.FC = () => {
  const { t } = useLanguage();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try { const cfg = await adminService.getAllConfig(); form.setFieldsValue(cfg); }
      catch { message.error(t('error')); }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async (values: Record<string, string>) => {
    setSaving(true);
    try { await adminService.saveAllConfig(values); message.success(t('sysconfig_saved')); }
    catch { message.error(t('error')); }
    setSaving(false);
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}><SettingOutlined style={{ fontSize: 18 }} /><span style={{ fontWeight: 500 }}>{t('sysconfig_title')}</span></Space>
      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Tabs items={[
          { key: 'email', label: <span><MailOutlined /> {t('sysconfig_tab_email')}</span>, children: (
            <Card size="small" loading={loading}>
              <Row gutter={16}>
                <Col span={12}><Form.Item name="email_smtp_host" label={t('sysconfig_smtp_host')}><Input placeholder="smtp.example.com" /></Form.Item></Col>
                <Col span={12}><Form.Item name="email_smtp_port" label={t('sysconfig_smtp_port')}><Input placeholder="587" /></Form.Item></Col>
                <Col span={12}><Form.Item name="email_smtp_user" label={t('sysconfig_smtp_user')}><Input placeholder="user@example.com" /></Form.Item></Col>
                <Col span={12}><Form.Item name="email_smtp_pass" label={t('sysconfig_smtp_pass')}><Input.Password /></Form.Item></Col>
                <Col span={24}><Form.Item name="email_from" label={t('sysconfig_email_from')}><Input placeholder="noreply@example.com" /></Form.Item></Col>
              </Row>
            </Card>
          )},
          { key: 'sms', label: <span><MessageOutlined /> {t('sysconfig_tab_sms')}</span>, children: (
            <Card size="small" loading={loading}>
              <Row gutter={16}>
                <Col span={12}><Form.Item name="sms_provider" label={t('sysconfig_sms_provider')}><Select placeholder={t('sysconfig_select_provider')} options={[{ value: 'aliyun', label: 'Aliyun' }, { value: 'tencent', label: 'Tencent Cloud' }, { value: 'twilio', label: 'Twilio' }]} allowClear /></Form.Item></Col>
                <Col span={12}><Form.Item name="sms_api_key" label={t('sysconfig_api_key')}><Input.Password /></Form.Item></Col>
              </Row>
            </Card>
          )},
          { key: 'storage', label: <span><CloudOutlined /> {t('sysconfig_tab_storage')}</span>, children: (
            <Card size="small" loading={loading}>
              <Row gutter={16}>
                <Col span={12}><Form.Item name="storage_type" label={t('sysconfig_storage_type')}><Select options={[{ value: 'local', label: t('sysconfig_storage_local') }, { value: 's3', label: 'AWS S3' }, { value: 'oss', label: 'Aliyun OSS' }]} /></Form.Item></Col>
                <Col span={12}><Form.Item name="storage_max_size" label={t('sysconfig_storage_max')}><Input placeholder="10" /></Form.Item></Col>
                <Col span={24}><Form.Item name="storage_path" label={t('sysconfig_storage_path')}><Input placeholder="./uploads" /></Form.Item></Col>
              </Row>
            </Card>
          )}
        ]} />
        <div style={{ marginTop: 16 }}><Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>{t('sysconfig_save_all')}</Button></div>
      </Form>
    </div>
  );
};

export default SystemConfigManager;
