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
    { icon: <RobotOutlined />, title: 'AI 智能助手', desc: 'AI驱动的销售洞察与智能推荐' },
    { icon: <BarChartOutlined />, title: '实时分析', desc: '实时监控销售绩效指标' },
    { icon: <FileTextOutlined />, title: '智能报表', desc: 'AI自动生成分析报告' },
    { icon: <TeamOutlined />, title: '团队协作', desc: '高效地与团队协作' },
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
          <Title level={1} style={{ color: '#fff', margin: 0, fontSize: 42, fontWeight: 700 }}>欢迎回来</Title>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, marginTop: 16, display: 'block' }}>AI驱动的智能客户关系管理平台，助力销售团队提升业绩。</Text>
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
              <Title level={3} style={{ margin: 0 }}>登录</Title>
              <Space>
                <Button type={language === 'zh' ? 'primary' : 'text'} size="small" onClick={() => setLanguage('zh')}>中文</Button>
                <Button type={language === 'en' ? 'primary' : 'text'} size="small" onClick={() => setLanguage('en')}>EN</Button>
              </Space>
            </div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>输入您的凭据以访问您的账户</Text>
            {error && <Alert title={error} type="error" showIcon style={{ marginBottom: 16 }} />}
            <Form layout="vertical" onFinish={handleSubmit} size="large">
              <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
                <Input prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} placeholder="请输入用户名" />
              </Form.Item>
              <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
                <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} placeholder="请输入密码" />
              </Form.Item>
              <Form.Item style={{ marginBottom: 16 }}>
                <Button type="primary" htmlType="submit" loading={loading} block style={{ height: 44, background: '#2563eb' }}>登录</Button>
              </Form.Item>
            </Form>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>演示账号</Text>
              <div style={{ marginTop: 4 }}><Text style={{ fontSize: 13 }}>账号: <Text code>admin</Text> 密码: <Text code>admin123</Text></Text></div>
            </div>
          </div>
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 24, fontSize: 12 }}>© 2025 Makrite CRM. 保留所有权利。</Text>
        </div>
      </div>
    </div>
  );
};

export default Login;
