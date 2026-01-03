import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Input, Button, Avatar, Typography, Row, Col, Divider, App, Tag, Descriptions, Switch, Tabs, Table, Select, Space, Modal, QRCode } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined, GlobalOutlined, CameraOutlined, LoadingOutlined, BellOutlined, SettingOutlined, MobileOutlined, HistoryOutlined, RobotOutlined, MailOutlined, ExportOutlined } from '@ant-design/icons';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../services/api';
import * as profileService from '../../services/profileService';

const { Title, Text } = Typography;
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

interface User { id: string; username: string; name?: string; role: 'admin' | 'sales_manager' | 'sales_rep' | 'finance'; avatar?: string; phone?: string; email?: string; created_at?: string; }
interface ProfileCenterProps { user: User; onUserUpdate: (user: User) => void; }

const ROLE_COLORS: Record<string, string> = { admin: '#f5222d', sales_manager: '#722ed1', sales_rep: '#1890ff', finance: '#52c41a' };

const ProfileCenter: React.FC<ProfileCenterProps> = ({ user, onUserUpdate }) => {
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [pwdSubmitting, setPwdSubmitting] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { language, setLanguage, t } = useLanguage();
  const { message } = App.useApp();
  const ROLE_LABELS: Record<string, string> = { admin: t('role_admin'), sales_manager: t('role_sales_manager'), sales_rep: t('role_sales_rep'), finance: t('role_finance') };
  const [prefs, setPrefs] = useState<profileService.UserPreferences | null>(null);
  const [loginHistory, setLoginHistory] = useState<profileService.LoginHistory[]>([]);
  const [devices, setDevices] = useState<profileService.UserDevice[]>([]);
  const [twoFactorModal, setTwoFactorModal] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');

  useEffect(() => { profileForm.setFieldsValue({ name: user.name, phone: (user as any).phone, email: (user as any).email }); }, [user, profileForm]);
  useEffect(() => { // 初始化加载用户偏好和历史数据
    const loadInitialData = async () => {
      const [prefsData, historyData, devicesData] = await Promise.all([
        profileService.getPreferences(),
        profileService.getLoginHistory(),
        profileService.getDevices()
      ]);
      setPrefs(prefsData);
      setLoginHistory(historyData);
      setDevices(devicesData);
    };
    loadInitialData();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { // 上传头像
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) { message.error(t('profile_avatar_error_type')); return; }
    if (file.size > 2 * 1024 * 1024) { message.error(t('profile_avatar_error_size')); return; }
    setAvatarUploading(true);
    try {
      const formData = new FormData(); formData.append('file', file);
      const uploadRes = await api.post('/upload/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await api.put('/profile/avatar', { avatar: uploadRes.data.url });
      onUserUpdate({ ...user, avatar: uploadRes.data.url }); message.success(t('profile_avatar_updated'));
    } catch (err: any) { message.error(err.response?.data?.message || t('profile_upload_failed')); }
    finally { setAvatarUploading(false); e.target.value = ''; }
  };

  const handleUpdateProfile = async (values: { name: string; phone?: string; email?: string }) => {
    setSubmitting(true);
    try { const res = await profileService.updateInfo(values); message.success(t('profile_info_updated')); onUserUpdate({ ...user, ...res }); }
    catch (err: any) { message.error(err.response?.data?.message || t('profile_update_failed')); }
    finally { setSubmitting(false); }
  };

  const handleChangePassword = async (values: { oldPassword: string; newPassword: string }) => {
    setPwdSubmitting(true);
    try { await api.put('/profile/password', values); message.success(t('profile_password_changed')); passwordForm.resetFields(); }
    catch (err: any) { message.error(err.response?.data?.message || t('profile_change_failed')); }
    finally { setPwdSubmitting(false); }
  };

  const handleSavePrefs = async (key: string, value: any) => { // 保存偏好
    try { await profileService.savePreferences({ [key]: value }); setPrefs(p => p ? { ...p, [key]: value } : p); message.success(t('profile_settings_saved')); }
    catch { message.error(t('profile_save_failed')); }
  };

  const handleEnableTwoFactor = async () => { // 启用两步验证
    try { const { secret } = await profileService.enableTwoFactor(); setTwoFactorSecret(secret); setTwoFactorModal(true); setPrefs(p => p ? { ...p, twoFactorEnabled: true } : p); }
    catch { message.error(t('profile_enable_failed')); }
  };

  const handleDisableTwoFactor = async () => { // 禁用两步验证
    try { await profileService.disableTwoFactor(); setPrefs(p => p ? { ...p, twoFactorEnabled: false } : p); message.success(t('profile_disabled_2fa')); }
    catch { message.error(t('profile_disable_failed')); }
  };

  const handleRemoveDevice = async (id: string) => { // 解绑设备
    try { await profileService.removeDevice(id); setDevices(d => d.filter(x => x.id !== id)); message.success(t('profile_device_unbound')); }
    catch { message.error(t('profile_unbind_failed')); }
  };


  const tabItems = [
    { key: 'profile', label: <><UserOutlined /> {t('profile_info')}</>, children: (
      <Card>
        <Form form={profileForm} layout="vertical" onFinish={handleUpdateProfile}>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="name" label={t('profile_name')} rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="phone" label={t('profile_phone')}><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="email" label={t('profile_email')}><Input type="email" /></Form.Item></Col>
          </Row>
          <Form.Item><Button type="primary" htmlType="submit" loading={submitting}>{t('profile_save_changes')}</Button></Form.Item>
        </Form>
      </Card>
    )},
    { key: 'security', label: <><SafetyOutlined /> {t('profile_security')}</>, children: (
      <Space orientation="vertical" style={{ width: '100%' }}>
        <Card title={t('profile_change_password')}>
          <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword} style={{ maxWidth: 400 }}>
            <Form.Item name="oldPassword" label={t('profile_old_password')} rules={[{ required: true }]}><Input.Password prefix={<LockOutlined />} /></Form.Item>
            <Form.Item name="newPassword" label={t('profile_new_password')} rules={[{ required: true }, { min: 6, message: t('profile_password_min') }]}><Input.Password prefix={<LockOutlined />} /></Form.Item>
            <Form.Item name="confirmPassword" label={t('profile_confirm_password')} dependencies={['newPassword']} rules={[{ required: true }, ({ getFieldValue }) => ({ validator(_, v) { return !v || getFieldValue('newPassword') === v ? Promise.resolve() : Promise.reject(t('profile_password_mismatch')); } })]}><Input.Password prefix={<LockOutlined />} /></Form.Item>
            <Form.Item><Button type="primary" danger htmlType="submit" loading={pwdSubmitting}>{t('profile_change_password')}</Button></Form.Item>
          </Form>
        </Card>
        <Card title={t('profile_two_factor')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><Text strong>{t('profile_two_factor')}</Text><br /><Text type="secondary">{t('profile_two_factor_desc')}</Text></div>
            <Switch checked={prefs?.twoFactorEnabled} onChange={v => v ? handleEnableTwoFactor() : handleDisableTwoFactor()} />
          </div>
        </Card>
      </Space>
    )},
    { key: 'notifications', label: <><BellOutlined /> {t('profile_notifications')}</>, children: (
      <Card>
        {[{ key: 'opportunity', label: t('profile_notify_opportunity'), desc: t('profile_notify_opportunity_desc') }, { key: 'task', label: t('profile_notify_task'), desc: t('profile_notify_task_desc') }, { key: 'approval', label: t('profile_notify_approval'), desc: t('profile_notify_approval_desc') }, { key: 'system', label: t('profile_notify_system'), desc: t('profile_notify_system_desc') }].map(item => (
          <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
            <div><Text strong>{item.label}</Text><br /><Text type="secondary">{item.desc}</Text></div>
            <Switch checked={prefs?.notifications?.[item.key as keyof typeof prefs.notifications]} onChange={v => handleSavePrefs('notifications', { ...prefs?.notifications, [item.key]: v })} />
          </div>
        ))}
      </Card>
    )},
    { key: 'preferences', label: <><SettingOutlined /> {t('profile_preferences')}</>, children: (
      <Space orientation="vertical" style={{ width: '100%' }}>
        <Card title={<><GlobalOutlined /> {t('profile_interface')}</>}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div><Text strong>{t('profile_language')}</Text></div>
            <Button onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}>{language === 'en' ? '切换到中文' : 'Switch to English'}</Button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><Text strong>{t('profile_theme')}</Text></div>
            <Select value={prefs?.theme || 'light'} onChange={v => handleSavePrefs('theme', v)} options={[{ value: 'light', label: t('profile_theme_light') }, { value: 'dark', label: t('profile_theme_dark') }]} style={{ width: 100 }} />
          </div>
        </Card>
        <Card title={<><ExportOutlined /> {t('profile_export_settings')}</>}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><Text strong>{t('profile_export_format')}</Text></div>
            <Select value={prefs?.exportFormat || 'xlsx'} onChange={v => handleSavePrefs('exportFormat', v)} options={[{ value: 'xlsx', label: 'Excel (.xlsx)' }, { value: 'csv', label: 'CSV' }, { value: 'pdf', label: 'PDF' }]} style={{ width: 140 }} />
          </div>
        </Card>
        <Card title={<><RobotOutlined /> {t('profile_ai_settings')}</>}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><Text strong>{t('profile_ai_style')}</Text><br /><Text type="secondary">{t('profile_ai_style_desc')}</Text></div>
            <Select value={prefs?.aiStyle || 'professional'} onChange={v => handleSavePrefs('aiStyle', v)} options={[{ value: 'professional', label: t('profile_ai_professional') }, { value: 'friendly', label: t('profile_ai_friendly') }, { value: 'concise', label: t('profile_ai_concise') }]} style={{ width: 120 }} />
          </div>
        </Card>
        <Card title={<><MailOutlined /> {t('profile_email_signature')}</>}>
          <Input.TextArea rows={4} value={prefs?.emailSignature || ''} onChange={e => setPrefs(p => p ? { ...p, emailSignature: e.target.value } : p)} placeholder={t('profile_email_signature')} />
          <Button type="primary" style={{ marginTop: 12 }} onClick={() => handleSavePrefs('emailSignature', prefs?.emailSignature || '')}>{t('profile_save_signature')}</Button>
        </Card>
      </Space>
    )},
    { key: 'history', label: <><HistoryOutlined /> {t('profile_login_history')}</>, children: (
      <Card>
        <Table dataSource={loginHistory} rowKey="created_at" pagination={false} columns={[
          { title: t('profile_login_time'), dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
          { title: t('profile_ip_address'), dataIndex: 'ip_address' },
          { title: t('profile_device_browser'), dataIndex: 'user_agent', ellipsis: true }
        ]} />
      </Card>
    )},
    { key: 'devices', label: <><MobileOutlined /> {t('profile_devices')}</>, children: (
      <Card>
        {devices.length === 0 ? <Text type="secondary">{t('profile_no_devices')}</Text> : (
          <Table dataSource={devices} rowKey="id" pagination={false} columns={[
            { title: t('profile_device_name'), dataIndex: 'device_name' },
            { title: t('profile_device_type'), dataIndex: 'device_type', render: (v: string) => <Tag>{v}</Tag> },
            { title: t('profile_last_active'), dataIndex: 'last_active', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
            { title: t('actions'), key: 'action', render: (_: any, r: any) => <Button type="link" danger onClick={() => handleRemoveDevice(r.id)}>{t('profile_unbind')}</Button> }
          ]} />
        )}
      </Card>
    )},
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Row gutter={24}>
        <Col xs={24} md={7}>
          <Card>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
                <Avatar size={80} style={{ background: user.avatar ? 'transparent' : '#2563eb', fontSize: 32 }} src={user.avatar ? `${API_BASE}${user.avatar}` : undefined}>{!user.avatar && (user.name?.slice(0, 1) || user.username.slice(0, 1))}</Avatar>
                <div style={{ position: 'absolute', bottom: 0, right: 0, background: '#1677ff', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
                  {avatarUploading ? <LoadingOutlined style={{ color: '#fff', fontSize: 12 }} /> : <CameraOutlined style={{ color: '#fff', fontSize: 12 }} />}
                </div>
              </div>
              <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
              <Title level={4} style={{ marginTop: 16, marginBottom: 4 }}>{user.name || user.username}</Title>
              <Tag color={ROLE_COLORS[user.role]}>{ROLE_LABELS[user.role] || user.role}</Tag>
              <Divider />
              <Descriptions column={1} size="small">
                <Descriptions.Item label={t('profile_username')}>{user.username}</Descriptions.Item>
                <Descriptions.Item label={t('profile_phone')}>{(user as any).phone || '-'}</Descriptions.Item>
                <Descriptions.Item label={t('profile_email')}>{(user as any).email || '-'}</Descriptions.Item>
                <Descriptions.Item label={t('profile_registered')}>{user.created_at?.split('T')[0] || '-'}</Descriptions.Item>
              </Descriptions>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={17}>
          <Card><Tabs items={tabItems} /></Card>
        </Col>
      </Row>
      <Modal title={t('profile_two_factor_enabled')} open={twoFactorModal} onCancel={() => setTwoFactorModal(false)} footer={<Button type="primary" onClick={() => setTwoFactorModal(false)}>{t('profile_two_factor_saved')}</Button>}>
        <div style={{ textAlign: 'center' }}>
          <QRCode value={`otpauth://totp/CRM:${user.username}?secret=${twoFactorSecret}`} />
          <div style={{ marginTop: 16 }}><Text strong>{t('profile_two_factor_secret')}：</Text><Text code copyable>{twoFactorSecret}</Text></div>
          <Text type="secondary">{t('profile_two_factor_scan')}</Text>
        </div>
      </Modal>
    </div>
  );
};

export default ProfileCenter;
