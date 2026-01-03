import { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button } from 'antd';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

class ErrorBoundary extends Component<Props, State> { // 错误边界组件
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) { // 记录错误日志
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => { // 重新加载页面
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Result
            status="error"
            title="页面出错了"
            subTitle={process.env.NODE_ENV === 'development' ? this.state.error?.message : '请刷新页面重试'}
            extra={<Button type="primary" onClick={this.handleReload}>刷新页面</Button>}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
