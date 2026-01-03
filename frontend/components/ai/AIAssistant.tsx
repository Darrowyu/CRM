import React, { useState } from 'react';
import { Button, Card, Typography, Space, Spin, Input } from 'antd';
import { CloseOutlined, AudioOutlined, CopyOutlined, SearchOutlined, ThunderboltOutlined, FileTextOutlined, SettingOutlined } from '@ant-design/icons';
import { aiService } from '../../services/aiService';
import { useLanguage } from '../../contexts/LanguageContext';
import AIConfigModal from './AIConfigModal';

const { Text, Paragraph } = Typography;

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [response, setResponse] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [queryMode, setQueryMode] = useState(false);
  const [queryInput, setQueryInput] = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  const { t } = useLanguage();

  const handleRecordToggle = async () => { // 录音/会议记录
    if (isRecording) {
      setIsRecording(false);
      setIsLoading(true);
      setTimeout(async () => {
        const simulatedTranscript = "今天和张总见面，他对5000个N95口罩感兴趣，希望周五前下单可以有5%折扣，需要和经理确认库存情况。";
        const refined = await aiService.refineNotes(simulatedTranscript);
        setResponse(refined || '');
        setIsLoading(false);
      }, 1500);
    } else { setIsRecording(true); setResponse(''); }
  };

  const handleGenerateEmail = async () => { // 生成跟进邮件
    setIsLoading(true);
    const result = await aiService.generateEmail('深圳创新科技', 'proposal', ['客户询问批量折扣', '对N95口罩感兴趣']);
    setResponse(result || '');
    setIsLoading(false);
  };

  const handleNaturalQuery = async () => { // 自然语言查询
    if (!queryInput.trim()) return;
    setIsLoading(true);
    try {
      const result = await aiService.naturalQuery(queryInput);
      let text = result.answer || '';
      if (result.data?.length) text += `\n\n查询结果：${result.data.length}条记录`;
      setResponse(text);
    } catch { setResponse('查询失败，请重试'); }
    finally { setIsLoading(false); setQueryMode(false); setQueryInput(''); }
  };

  const AIIconSmall = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="12" rx="3" stroke="#60a5fa" strokeWidth="2"/><circle cx="8" cy="12" r="1.5" fill="#60a5fa"/><circle cx="16" cy="12" r="1.5" fill="#60a5fa"/><path d="M10 15h4" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/><path d="M12 3v3M7 4l1 2M17 4l-1 2" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/></svg>);
  const AIIconLarge = () => (<svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 16 }}><rect x="3" y="6" width="18" height="12" rx="3" stroke="#e2e8f0" strokeWidth="1.5"/><circle cx="8" cy="12" r="1.5" fill="#e2e8f0"/><circle cx="16" cy="12" r="1.5" fill="#e2e8f0"/><path d="M10 15h4" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round"/><path d="M12 3v3M7 4l1 2M17 4l-1 2" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round"/></svg>);
  const AIIconBtn = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="12" rx="3" stroke="white" strokeWidth="1.8"/><circle cx="8" cy="12" r="1.5" fill="white"/><circle cx="16" cy="12" r="1.5" fill="white"/><path d="M10 15h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><path d="M12 3v3M7 4l1 2M17 4l-1 2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>);

  if (!isOpen) return (
    <div onClick={() => setIsOpen(true)} style={{ position: 'fixed', bottom: 24, right: 24, width: 56, height: 56, background: '#2563eb', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)', zIndex: 1000 }}>
      <AIIconBtn />
    </div>
  );

  return (
    <Card style={{ position: 'fixed', bottom: 24, right: 24, width: 380, zIndex: 1000, borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }} styles={{ body: { padding: 0 } }}>
      <div style={{ background: '#1e293b', padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space><AIIconSmall /><Text strong style={{ color: '#fff' }}>Makrite AI</Text></Space>
        <Space>
          <Button type="text" icon={<SettingOutlined style={{ color: '#94a3b8' }} />} onClick={() => setConfigOpen(true)} />
          <Button type="text" icon={<CloseOutlined style={{ color: '#94a3b8' }} />} onClick={() => setIsOpen(false)} />
        </Space>
      </div>
      <AIConfigModal open={configOpen} onClose={() => setConfigOpen(false)} />

      <div style={{ padding: 16, height: 360, overflow: 'auto', background: '#f8fafc' }}>
        {!response && !isLoading && !isRecording && !queryMode && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <AIIconLarge />
            <Text type="secondary" style={{ marginBottom: 24 }}>{t('ai_greeting')}</Text>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button block icon={<FileTextOutlined />} onClick={handleGenerateEmail} style={{ textAlign: 'left', height: 'auto', padding: 12 }}>{t('ai_btn_email')}</Button>
              <Button block icon={<AudioOutlined />} onClick={handleRecordToggle} style={{ textAlign: 'left', height: 'auto', padding: 12 }}>{t('ai_btn_notes')}</Button>
              <Button block icon={<SearchOutlined />} onClick={() => setQueryMode(true)} style={{ textAlign: 'left', height: 'auto', padding: 12 }}>智能查询</Button>
            </div>
          </div>
        )}

        {queryMode && !isLoading && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <ThunderboltOutlined style={{ fontSize: 32, color: '#2563eb', marginBottom: 16 }} />
            <Text strong style={{ marginBottom: 16 }}>用自然语言查询CRM数据</Text>
            <Input.TextArea value={queryInput} onChange={e => setQueryInput(e.target.value)} placeholder="例如：本月成交金额最高的客户是谁？" rows={3} style={{ marginBottom: 16 }} />
            <Space>
              <Button type="primary" onClick={handleNaturalQuery} disabled={!queryInput.trim()}>查询</Button>
              <Button onClick={() => { setQueryMode(false); setQueryInput(''); }}>取消</Button>
            </Space>
          </div>
        )}

        {isRecording && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 64, height: 64, background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <AudioOutlined style={{ fontSize: 32, color: '#ef4444' }} />
            </div>
            <Text strong>{t('ai_listening')}</Text>
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>{t('ai_speak_hint')}</Text>
            <Button onClick={handleRecordToggle} style={{ marginTop: 24 }}>{t('ai_stop')}</Button>
          </div>
        )}

        {isLoading && <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin size="large" /></div>}

        {response && (
          <Card size="small">
            <Paragraph style={{ whiteSpace: 'pre-line', marginBottom: 16 }}>{response}</Paragraph>
            <Space>
              <Button type="primary" icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText(response); }}>{t('ai_copy')}</Button>
              <Button onClick={() => setResponse('')}>{t('ai_back')}</Button>
            </Space>
          </Card>
        )}
      </div>
    </Card>
  );
};

export default AIAssistant;
