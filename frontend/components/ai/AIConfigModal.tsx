import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Alert, Space, Tag, Spin, App } from 'antd';
import { SettingOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { aiService, AIConfigStatus, UserAIConfig } from '../../services/aiService';

interface Props { open: boolean; onClose: () => void; }

const AIConfigModal: React.FC<Props> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AIConfigStatus | null>(null);
  const { message } = App.useApp();

  useEffect(() => { // 加载配置
    if (open) {
      setLoading(true);
      aiService.getConfig().then(setConfig).catch(() => message.error('加载配置失败')).finally(() => setLoading(false));
    }
  }, [open, message]);

  const handleSave = async (values: UserAIConfig) => { // 保存配置
    setSaving(true);
    try {
      await aiService.saveConfig(values);
      message.success('AI配置已保存');
      onClose();
    } catch { message.error('保存失败'); }
    finally { setSaving(false); }
  };

  const handleReset = async () => { // 恢复默认
    setSaving(true);
    try {
      await aiService.clearConfig();
      form.resetFields();
      message.success('已恢复系统默认配置');
      const newConfig = await aiService.getConfig();
      setConfig(newConfig);
    } catch { message.error('操作失败'); }
    finally { setSaving(false); }
  };

  const StatusTag = ({ has, label }: { has: boolean; label: string }) => (
    <Tag icon={has ? <CheckCircleOutlined /> : <CloseCircleOutlined />} color={has ? 'success' : 'default'}>{label}</Tag>
  );

  return (
    <Modal title={<Space><SettingOutlined />AI 服务配置</Space>} open={open} onCancel={onClose} footer={null} width={500}>
      {loading ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div> : (
        <>
          <Alert type="info" showIcon title="系统默认配置" description={
            <Space style={{ marginTop: 8 }}>
              <StatusTag has={config?.default.hasGemini || false} label="Gemini" />
              <StatusTag has={config?.default.hasOpenai || false} label="OpenAI" />
              <StatusTag has={config?.default.hasDeepseek || false} label="DeepSeek" />
              <Tag color="blue">默认: {config?.default.provider}</Tag>
            </Space>
          } style={{ marginBottom: 16 }} />

          {config?.user && (
            <Alert type="success" showIcon title="您已配置自定义Key" description={
              <Space style={{ marginTop: 8 }}>
                <StatusTag has={config.user.hasGemini} label="Gemini" />
                <StatusTag has={config.user.hasOpenai} label="OpenAI" />
                <StatusTag has={config.user.hasDeepseek} label="DeepSeek" />
              </Space>
            } style={{ marginBottom: 16 }} />
          )}

          <Form form={form} layout="vertical" onFinish={handleSave} initialValues={{ provider: config?.user?.provider || config?.default.provider }}>
            <Form.Item name="provider" label="首选AI服务">
              <Select options={[{ value: 'gemini', label: 'Google Gemini' }, { value: 'openai', label: 'OpenAI GPT' }, { value: 'deepseek', label: 'DeepSeek（国内推荐）' }]} />
            </Form.Item>
            <Form.Item name="geminiKey" label="Gemini API Key" extra="留空则使用系统默认">
              <Input.Password placeholder="AIza..." autoComplete="off" />
            </Form.Item>
            <Form.Item name="openaiKey" label="OpenAI API Key" extra="留空则使用系统默认">
              <Input.Password placeholder="sk-..." autoComplete="off" />
            </Form.Item>
            <Form.Item name="deepseekKey" label="DeepSeek API Key" extra="留空则使用系统默认">
              <Input.Password placeholder="sk-..." autoComplete="off" />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={saving}>保存配置</Button>
                <Button onClick={handleReset} loading={saving}>恢复默认</Button>
                <Button onClick={onClose}>取消</Button>
              </Space>
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  );
};

export default AIConfigModal;
