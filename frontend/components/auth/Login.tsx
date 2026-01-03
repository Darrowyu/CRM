import React, { useState } from 'react';
import { Form, Input, Button, Alert, Typography, Space } from 'antd';
import { UserOutlined, LockOutlined, BarChartOutlined, FileTextOutlined, TeamOutlined, CheckOutlined, RobotOutlined } from '@ant-design/icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { authService } from '../../services/authService';

const { Title, Text } = Typography;

// 系统Logo路径
const LOGO_PATH = '/logo/Makrite_CRM_logo.png';

interface LoginProps { onLogin: (user: any, token: string, permissions?: string[]) => void; }

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const { t, language, setLanguage } = useLanguage();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (values: { username: string; password: string }) => {
        setError('');
        setLoading(true);
        try {
            const { token, user, permissions } = await authService.login(values.username, values.password);
            sessionStorage.setItem('token', token); // 使用sessionStorage，关闭浏览器自动清除
            sessionStorage.setItem('user', JSON.stringify(user));
            sessionStorage.setItem('permissions', JSON.stringify(permissions || []));
            localStorage.removeItem('activeTab'); // 登录后重置到首页
            onLogin(user, token, permissions || []);
        } catch (err: any) {
            setError(err.response?.data?.message || t('login_error'));
        } finally {
            setLoading(false);
        }
    };

    const features = [
        { icon: <RobotOutlined />, title: t('login_feature_ai'), desc: t('login_feature_ai_desc') },
        { icon: <BarChartOutlined />, title: t('login_feature_analytics'), desc: t('login_feature_analytics_desc') },
        { icon: <FileTextOutlined />, title: t('login_feature_reports'), desc: t('login_feature_reports_desc') },
        { icon: <TeamOutlined />, title: t('login_feature_team'), desc: t('login_feature_team_desc') },
    ];

    return (
        <div style={{ minHeight: '100vh', display: 'flex' }}>
            {/* 左侧品牌区域 */}
            <div style={{ flex: 1, background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)', padding: '48px 64px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '100vh' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 64 }}>
                        <img src={LOGO_PATH} alt="Makrite Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>Makrite CRM</Text>
                    </div>
                    <Title level={1} style={{ color: '#fff', margin: 0, fontSize: 42, fontWeight: 700 }}>{t('login_welcome')}</Title>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, marginTop: 16, display: 'block' }}>{t('login_subtitle')}</Text>
                </div>
                <div style={{ marginTop: 'auto' }}>
                    {features.map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 24 }}>
                            <div style={{ color: '#93c5fd', fontSize: 16, marginTop: 2 }}><CheckOutlined /></div>
                            <div>
                                <Text style={{ color: '#fff', fontWeight: 600, display: 'block' }}>{f.title}</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{f.desc}</Text>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {/* 右侧登录区域 */}
            <div style={{ flex: 1, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
                <div style={{ width: '100%', maxWidth: 400 }}>
                    <div style={{ background: '#fff', borderRadius: 16, padding: 40, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Title level={3} style={{ margin: 0 }}>{t('login_title')}</Title>
                            <Space>
                                <Button type={language === 'zh' ? 'primary' : 'text'} size="small" onClick={() => setLanguage('zh')}>中文</Button>
                                <Button type={language === 'en' ? 'primary' : 'text'} size="small" onClick={() => setLanguage('en')}>EN</Button>
                            </Space>
                        </div>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>{t('login_credential_hint')}</Text>
                        {error && <Alert title={error} type="error" showIcon style={{ marginBottom: 16 }} />}
                        <Form layout="vertical" onFinish={handleSubmit} size="large">
                            <Form.Item name="username" label={t('login_username')} rules={[{ required: true, message: t('login_placeholder_user') }]}>
                                <Input prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} placeholder={t('login_placeholder_user')} />
                            </Form.Item>
                            <Form.Item name="password" label={t('login_password')} rules={[{ required: true, message: t('login_placeholder_pwd') }]}>
                                <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} placeholder={t('login_placeholder_pwd')} />
                            </Form.Item>
                            <Form.Item style={{ marginBottom: 16 }}>
                                <Button type="primary" htmlType="submit" loading={loading} block style={{ height: 44, background: '#2563eb' }}>{t('login_btn')}</Button>
                            </Form.Item>
                        </Form>
                        <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, marginTop: 8 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>{t('login_demo_account')}</Text>
                            <div style={{ marginTop: 4 }}><Text style={{ fontSize: 13 }}>{t('login_demo_username')}: <Text code>admin</Text> {t('login_demo_password')}: <Text code>admin123</Text></Text></div>
                        </div>
                    </div>
                    <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 24, fontSize: 12 }}>{t('login_copyright')}</Text>
                </div>
            </div>
        </div>
    );
};

export default Login;