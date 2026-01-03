import React, { useState, useMemo, useCallback, memo } from 'react';
import { Layout as AntLayout, Menu, Button, Avatar, Typography, Tooltip, Badge } from 'antd';
import { DashboardOutlined, TeamOutlined, FunnelPlotOutlined, FileTextOutlined, SettingOutlined, LogoutOutlined, MenuOutlined, CloseOutlined, GlobalOutlined, QuestionCircleOutlined, UserOutlined, CheckSquareOutlined, AimOutlined, FileProtectOutlined, MoneyCollectOutlined, RadarChartOutlined, LineChartOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { NotificationCenter } from '../notification';
import { useLanguage } from '../../contexts/LanguageContext';

const LOGO_PATH = '/logo/Makrite_CRM_logo.png';

const { Sider, Content, Header } = AntLayout;
const { Text } = Typography;

interface User {
  id: string;
  username: string;
  role: 'admin' | 'sales_manager' | 'sales_rep' | 'finance';
  name?: string;
  avatar?: string;
}

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User;
  onLogout: () => void;
}

const getRoleLabel = (role: string, t: (key: any) => string): string => {
  const roleKeys: Record<string, string> = { admin: 'role_admin', sales_manager: 'role_sales_manager', sales_rep: 'role_sales_rep', finance: 'role_finance' };
  return t(roleKeys[role] || role);
};

const ROLE_COLORS: Record<string, string> = { admin: '#f5222d', sales_manager: '#722ed1', sales_rep: '#1890ff', finance: '#52c41a' };

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, user, onLogout }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { t, language, setLanguage } = useLanguage();

  const menuItems = useMemo(() => [ // 缓存菜单项，避免重复创建
    { key: 'dashboard', icon: <DashboardOutlined />, label: t('nav_dashboard') },
    { key: 'customers', icon: <TeamOutlined />, label: t('nav_customers') },
    { key: 'opportunities', icon: <FunnelPlotOutlined />, label: t('nav_pipeline') },
    { key: 'quotes', icon: <FileTextOutlined />, label: t('nav_quotes') },
    { key: 'tasks', icon: <CheckSquareOutlined />, label: t('nav_tasks') },
    { key: 'targets', icon: <AimOutlined />, label: t('nav_targets') },
    { key: 'contracts', icon: <FileProtectOutlined />, label: t('nav_contracts') },
    { key: 'payments', icon: <MoneyCollectOutlined />, label: t('nav_payments') },
    { key: 'competitors', icon: <RadarChartOutlined />, label: t('nav_competitors') },
    { key: 'analytics', icon: <LineChartOutlined />, label: t('nav_analytics') },
    { key: 'agent', icon: <ThunderboltOutlined />, label: t('nav_agent') },
    ...(user.role === 'admin' ? [{ key: 'admin', icon: <SettingOutlined />, label: t('nav_admin') }] : []),
  ], [t, user.role]);

  const handleMenuClick = useCallback(({ key }: { key: string }) => setActiveTab(key), [setActiveTab]); // 缓存回调
  const toggleLanguage = useCallback(() => setLanguage(language === 'en' ? 'zh' : 'en'), [language, setLanguage]);
  const handleProfile = useCallback(() => setActiveTab('profile'), [setActiveTab]);

  const currentLabel = useMemo(() => activeTab === 'profile' ? t('nav_profile') : (menuItems.find(i => i.key === activeTab)?.label || ''), [activeTab, menuItems, t]);
  const tooltips = useMemo<Record<string, string>>(() => ({ opportunities: t('pipe_tooltip') }), [t]); // 缓存tooltips

  return (
    <AntLayout style={{ height: '100vh', overflow: 'hidden' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark" width={240} style={{ background: '#0f172a', height: '100vh', position: 'fixed', left: 0, top: 0, zIndex: 100 }} breakpoint="md" onBreakpoint={(broken) => setCollapsed(broken)}>
        <div style={{ padding: collapsed ? '20px 0' : '20px 16px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 12, transition: 'all 0.2s ease' }}>
          <img src={LOGO_PATH} alt="Makrite Logo" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
          <div style={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : 'auto', overflow: 'hidden', whiteSpace: 'nowrap', transition: 'opacity 0.2s ease, width 0.2s ease' }}>
            <Text strong style={{ color: '#fff', fontSize: 16 }}>Makrite AI</Text><br /><Text style={{ color: '#94a3b8', fontSize: 11 }}>{t('app_subtitle')}</Text>
          </div>
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[activeTab]} onClick={handleMenuClick} items={menuItems} style={{ background: 'transparent', marginTop: 16 }} className="no-flash-menu" />
        <div style={{ position: 'absolute', bottom: 0, width: '100%', borderTop: '1px solid #334155', background: '#1e293b' }}>
          {/* 用户信息区 */}
          <div style={{ padding: collapsed ? '12px 0' : '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: collapsed ? 0 : 10, transition: 'all 0.2s ease' }}>
            <Avatar size={36} style={{ background: user.avatar ? 'transparent' : '#2563eb', flexShrink: 0 }} icon={!user.avatar && <UserOutlined />} src={user.avatar ? `${API_BASE}${user.avatar}` : undefined}>{!user.avatar && user.username.slice(0, 1).toUpperCase()}</Avatar>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <Text style={{ color: '#fff', fontSize: 13, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || user.username}</Text>
                <Badge color={ROLE_COLORS[user.role] || '#1890ff'} text={<Text style={{ color: '#94a3b8', fontSize: 11 }}>{getRoleLabel(user.role, t)}</Text>} />
              </div>
            )}
          </div>
          {/* 操作按钮区 */}
          <div style={{ padding: collapsed ? '8px 0' : '8px 16px', borderTop: '1px solid #334155', display: 'flex', flexDirection: collapsed ? 'column' : 'row', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: 4, transition: 'all 0.2s ease' }}>
            {collapsed ? (
              <>
                <Tooltip title={t('nav_profile')} placement="right"><Button type="text" icon={<SettingOutlined />} onClick={handleProfile} style={{ color: '#94a3b8' }} size="small" /></Tooltip>
                <Tooltip title={t('logout')} placement="right"><Button type="text" icon={<LogoutOutlined />} onClick={onLogout} style={{ color: '#94a3b8' }} size="small" /></Tooltip>
              </>
            ) : (
              <>
                <Button type="text" icon={<SettingOutlined />} onClick={handleProfile} style={{ color: '#94a3b8', fontSize: 12 }} size="small">{t('admin_settings')}</Button>
                <Button type="text" icon={<LogoutOutlined />} onClick={onLogout} style={{ color: '#94a3b8', fontSize: 12 }} size="small">{t('logout')}</Button>
              </>
            )}
          </div>
        </div>
      </Sider>
      <AntLayout style={{ marginLeft: collapsed ? 80 : 240, transition: 'margin-left 0.2s' }}>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, zIndex: 99 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button type="text" icon={collapsed ? <MenuOutlined /> : <CloseOutlined />} onClick={() => setCollapsed(!collapsed)} className="md:hidden" />
            <Text strong style={{ fontSize: 20, minWidth: 100 }}>{currentLabel}</Text>
            {tooltips[activeTab] && <Tooltip title={tooltips[activeTab]}><QuestionCircleOutlined style={{ color: '#94a3b8', cursor: 'help' }} /></Tooltip>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button icon={<GlobalOutlined />} onClick={toggleLanguage}>{language === 'en' ? '中文' : 'English'}</Button>
            <NotificationCenter />
          </div>
        </Header>
        <Content style={{ padding: 24, background: '#f8fafc', overflowY: 'auto', overflowX: 'hidden', height: 'calc(100vh - 64px)', position: 'relative' }} className="scrollbar-hide">
          <div style={{ maxWidth: 1400, margin: '0 auto', position: 'relative' }}>{children}</div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default memo(Layout); // 使用memo避免不必要的重渲染
