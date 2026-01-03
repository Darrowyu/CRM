import React, { useState, Suspense, lazy, useCallback, memo } from 'react';
import { ConfigProvider, Spin, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { Layout, ErrorBoundary } from './components/common';
import { Login } from './components/auth';
import { AIAssistant } from './components/ai';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// 懒加载组件 - 代码分割优化首屏加载
const Dashboard = lazy(() => import('./components/dashboard/Dashboard'));
const CustomerList = lazy(() => import('./components/customer/CustomerList'));
const OpportunityBoard = lazy(() => import('./components/opportunity/OpportunityBoard'));
const QuoteGenerator = lazy(() => import('./components/quote/QuoteGenerator'));
const AdminPanel = lazy(() => import('./components/admin/AdminPanel'));
const ProfileCenter = lazy(() => import('./components/profile/ProfileCenter'));
const TaskList = lazy(() => import('./components/task/TaskList'));
const SalesTargetPanel = lazy(() => import('./components/target/SalesTargetPanel'));
const ContractList = lazy(() => import('./components/contract/ContractList'));
const PaymentManager = lazy(() => import('./components/contract/PaymentManager'));
const CompetitorManager = lazy(() => import('./components/competitor/CompetitorManager'));
const AnalyticsPanel = lazy(() => import('./components/analytics/AnalyticsPanel'));
const AgentPanel = lazy(() => import('./components/agent/AgentPanel'));

// 页面配置
const PAGE_COMPONENTS: Record<string, React.LazyExoticComponent<React.FC<any>>> = {
  dashboard: Dashboard, customers: CustomerList, opportunities: OpportunityBoard,
  quotes: QuoteGenerator, tasks: TaskList, targets: SalesTargetPanel,
  contracts: ContractList, payments: PaymentManager, competitors: CompetitorManager,
  analytics: AnalyticsPanel, agent: AgentPanel, admin: AdminPanel, profile: ProfileCenter,
};

// 缓存页面组件，避免重复渲染
const CachedPage = memo(({ tabKey, isActive, user, onUserUpdate }: { tabKey: string; isActive: boolean; user: any; onUserUpdate: (u: any) => void }) => {
  const Component = PAGE_COMPONENTS[tabKey];
  if (!Component) return null;
  const props = tabKey === 'profile' ? { user, onUserUpdate } : {};
  return (
    <div style={{ display: isActive ? 'block' : 'none', visibility: isActive ? 'visible' : 'hidden', position: isActive ? 'relative' : 'absolute', width: '100%' }}>
      <Suspense fallback={<PageLoader />}><Component {...props} /></Suspense>
    </div>
  );
});

const theme = { // Ant Design主题配置
  token: {
    colorPrimary: '#2563eb',
    borderRadius: 8,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
};

// 页面加载占位符
const PageLoader = () => <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}><Spin size="large" /></div>;

const MainApp: React.FC = () => {
  const { user, login, logout, isLoading } = useAuth();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('dashboard'); // 登录默认首页
  const [visitedTabs, setVisitedTabs] = useState<string[]>(['dashboard']);

  const handleSetActiveTab = useCallback((tab: string) => {
    setVisitedTabs(prev => prev.includes(tab) ? prev : [...prev, tab]);
    setActiveTab(tab);
    localStorage.setItem('activeTab', tab);
  }, []);

  const handleUserUpdate = useCallback((updatedUser: typeof user) => {
    if (updatedUser) localStorage.setItem('user', JSON.stringify(updatedUser));
  }, []);

  if (isLoading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin size="large" /></div>;
  if (!user) return <Login onLogin={login} />;

  return (
    <ConfigProvider theme={theme} locale={language === 'zh' ? zhCN : enUS}>
      <AntApp>
        <Layout activeTab={activeTab} setActiveTab={handleSetActiveTab} user={user} onLogout={logout}>
          {/* KeepAlive: 已访问页面保持挂载，通过display切换 */}
          {visitedTabs.map(tab => (
            <CachedPage key={tab} tabKey={tab} isActive={tab === activeTab} user={user} onUserUpdate={handleUserUpdate} />
          ))}
          <AIAssistant />
        </Layout>
      </AntApp>
    </ConfigProvider>
  );
};

const AppWrapper: React.FC = () => { // 用key强制MainApp在用户变化时重新挂载
  const { user } = useAuth();
  return <MainApp key={user?.id || 'guest'} />;
};

const App: React.FC = () => (
  <ErrorBoundary>
    <LanguageProvider>
      <AuthProvider>
        <ConfigProvider theme={theme}>
          <AppWrapper />
        </ConfigProvider>
      </AuthProvider>
    </LanguageProvider>
  </ErrorBoundary>
);

export default App;
