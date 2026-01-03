import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Button, Tag, Typography, Alert, Badge, Spin, Modal, Form, Input, InputNumber, Select, DatePicker, Drawer, Descriptions, App, Popconfirm, Space, Empty, Collapse, Progress, Row, Col, Tabs, List, Timeline } from 'antd';
import { ThunderboltOutlined, SyncOutlined, WarningOutlined, PlusOutlined, EditOutlined, DeleteOutlined, DollarOutlined, HolderOutlined, CheckCircleOutlined, CloseCircleOutlined, PhoneOutlined, MailOutlined, UserOutlined, FileTextOutlined } from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DroppableStateSnapshot, DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd';
import { opportunityService, Opportunity, StageSummary, FollowUp, Quote } from '../../services/opportunityService';
import { customerService, Customer } from '../../services/customerService';
import { aiService } from '../../services/aiService';
import { useLanguage } from '../../contexts/LanguageContext';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { TextArea } = Input;

const ACTIVE_STAGES = ['prospecting', 'qualification', 'proposal', 'negotiation']; // 活跃阶段
const CLOSED_STAGES = ['closed_won', 'closed_lost']; // 已结束阶段
const STAGE_MAP: Record<string, string> = { prospecting: '初步接触', qualification: '需求确认', proposal: '方案报价', negotiation: '商务谈判', closed_won: '成交', closed_lost: '丢单' };
const STAGE_COLORS: Record<string, string> = { prospecting: '#1890ff', qualification: '#13c2c2', proposal: '#52c41a', negotiation: '#faad14', closed_won: '#52c41a', closed_lost: '#ff4d4f' };

const OpportunityBoard: React.FC = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [summary, setSummary] = useState<StageSummary[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [lossReasonOpen, setLossReasonOpen] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [pendingStage, setPendingStage] = useState<{ id: string; stage: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [followUpForm] = Form.useForm();
  const [pipelineAnalysis, setPipelineAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [lossForm] = Form.useForm();
  const { t } = useLanguage();
  const { message } = App.useApp();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [opps, sum, custs] = await Promise.all([opportunityService.getAllWithCustomer(), opportunityService.getSummary(), customerService.getPrivatePool()]);
      setOpportunities(opps);
      setSummary(sum);
      setCustomers(custs);
    } catch { message.error(t('opp_load_failed')); }
    finally { setLoading(false); }
  }, [message, t]);

  useEffect(() => { loadData(); }, [loadData]);

  // 使用useMemo缓存统计值
  const totalPipelineValue = useMemo(() => summary.reduce((acc, s) => acc + Number(s.total_amount), 0), [summary]);
  const totalActiveCount = useMemo(() => ACTIVE_STAGES.reduce((acc, s) => acc + opportunities.filter(o => o.stage === s).length, 0), [opportunities]);
  const closedWonCount = useMemo(() => opportunities.filter(o => o.stage === 'closed_won').length, [opportunities]);
  const closedLostCount = useMemo(() => opportunities.filter(o => o.stage === 'closed_lost').length, [opportunities]);
  const closedWonAmount = useMemo(() => opportunities.filter(o => o.stage === 'closed_won').reduce((acc, o) => acc + (o.amount || 0), 0), [opportunities]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const newStage = destination.droppableId;
    if (newStage === 'closed_lost') { setPendingStage({ id: draggableId, stage: newStage }); setLossReasonOpen(true); return; }
    setOpportunities(prev => prev.map(op => op.id === draggableId ? { ...op, stage: newStage } : op));
    try {
      await opportunityService.updateStage(draggableId, newStage);
      message.success(t('opp_stage_updated'));
      loadData();
    } catch (err: any) { message.error(err.response?.data?.message || t('opp_update_failed')); loadData(); }
  };

  const handleAIAnalysis = async () => { // 深度审计
    setIsAnalyzing(true);
    try {
      const result = await aiService.analyzePipeline();
      setPipelineAnalysis(result.analysis || null);
    } catch { message.error(t('opp_ai_failed')); }
    finally { setIsAnalyzing(false); }
  };

  const handleCreate = async (values: any) => {
    setSubmitting(true);
    try {
      await opportunityService.create({ ...values, expected_close_date: values.expected_close_date?.format('YYYY-MM-DD') });
      message.success(t('opp_create_success'));
      setModalOpen(false);
      form.resetFields();
      loadData();
    } catch (err: any) { message.error(err.response?.data?.message || t('opp_create_failed')); }
    finally { setSubmitting(false); }
  };

  const handleUpdate = async (values: any) => {
    if (!selectedOpp) return;
    setSubmitting(true);
    try {
      await opportunityService.update(selectedOpp.id, { ...values, expected_close_date: values.expected_close_date?.format('YYYY-MM-DD') });
      message.success(t('opp_update_success'));
      setEditOpen(false);
      editForm.resetFields();
      loadData();
    } catch { message.error(t('opp_update_failed')); }
    finally { setSubmitting(false); }
  };

  const handleStageChange = async (id: string, newStage: string) => {
    if (newStage === 'closed_lost') { setPendingStage({ id, stage: newStage }); setLossReasonOpen(true); return; }
    try { await opportunityService.updateStage(id, newStage); message.success(t('opp_stage_updated')); loadData(); }
    catch (err: any) { message.error(err.response?.data?.message || t('opp_update_failed')); }
  };

  const handleLossConfirm = async (values: { loss_reason: string }) => {
    if (!pendingStage) return;
    setSubmitting(true);
    try {
      await opportunityService.updateStage(pendingStage.id, pendingStage.stage, values.loss_reason);
      message.success(t('opp_loss_marked'));
      setLossReasonOpen(false);
      lossForm.resetFields();
      setPendingStage(null);
      loadData();
    } catch { message.error(t('opp_operation_failed')); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try { await opportunityService.delete(id); message.success(t('opp_delete_success')); setDetailOpen(false); loadData(); }
    catch { message.error(t('opp_delete_failed')); }
  };

  const handleViewDetail = async (opp: Opportunity) => {
    setSelectedOpp(opp);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const [fups, qts] = await Promise.all([opportunityService.getFollowUps(opp.id), opportunityService.getQuotes(opp.id)]);
      setFollowUps(fups);
      setQuotes(qts);
    } catch { /* ignore */ }
    finally { setDetailLoading(false); }
  };
  const handleEdit = (opp: Opportunity) => {
    setSelectedOpp(opp);
    editForm.setFieldsValue({ ...opp, expected_close_date: opp.expected_close_date ? dayjs(opp.expected_close_date) : undefined });
    setDetailOpen(false);
    setEditOpen(true);
  };

  const handleAddFollowUp = async (values: { content: string; type: string }) => {
    if (!selectedOpp) return;
    setSubmitting(true);
    try {
      await opportunityService.addFollowUp({ ...values, opportunity_id: selectedOpp.id, customer_id: selectedOpp.customer_id });
      message.success(t('opp_followup_added'));
      followUpForm.resetFields();
      const fups = await opportunityService.getFollowUps(selectedOpp.id);
      setFollowUps(fups);
    } catch { message.error(t('opp_add_failed')); }
    finally { setSubmitting(false); }
  };

  // 使用useMemo缓存映射对象
  const FOLLOW_TYPE_MAP: Record<string, { icon: React.ReactNode; color: string; label: string }> = useMemo(() => ({
    call: { icon: <PhoneOutlined />, color: '#1890ff', label: t('task_type_call') },
    visit: { icon: <UserOutlined />, color: '#52c41a', label: t('task_type_visit') },
    email: { icon: <MailOutlined />, color: '#faad14', label: t('task_type_email') },
    other: { icon: <FileTextOutlined />, color: '#8c8c8c', label: t('task_type_other') },
  }), [t]);

  const QUOTE_STATUS_MAP: Record<string, { color: string; label: string }> = useMemo(() => ({
    draft: { color: 'default', label: t('quote_status_draft') },
    pending_manager: { color: 'processing', label: t('quote_status_pending') },
    approved: { color: 'success', label: t('quote_status_approved') },
    rejected: { color: 'error', label: t('quote_status_rejected') },
    sent: { color: 'cyan', label: t('quote_status_sent') },
  }), [t]);

  const renderOpportunityCard = (op: Opportunity, provided: DraggableProvided, snapshot: DraggableStateSnapshot, isClosed: boolean) => (
    <div ref={provided.innerRef} {...provided.draggableProps} style={{ ...provided.draggableProps.style }}>
      <Card size="small" hoverable onClick={() => handleViewDetail(op)} style={{ cursor: 'pointer', borderLeft: `3px solid ${STAGE_COLORS[op.stage]}`, background: snapshot.isDragging ? '#fff' : undefined, boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : undefined }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <Space>
            {!isClosed && <span {...provided.dragHandleProps} style={{ cursor: 'grab' }}><HolderOutlined style={{ color: '#bfbfbf' }} /></span>}
            <Tag color={STAGE_COLORS[op.stage]}>{op.probability}%</Tag>
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>{op.expected_close_date ? dayjs(op.expected_close_date).format('MM-DD') : '-'}</Text>
        </div>
        <Text strong style={{ display: 'block', marginBottom: 4 }}>{op.name}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>{op.customer_name}</Text>
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#52c41a', fontWeight: 500 }}>¥{Number(op.amount || 0).toLocaleString()}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{op.owner_name}</Text>
        </div>
        {op.probability < 30 && !isClosed && (
          <div style={{ marginTop: 8, background: '#fffbe6', padding: '4px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <WarningOutlined style={{ color: '#faad14', fontSize: 12 }} /><Text style={{ color: '#d48806', fontSize: 12 }}>{t('deal_stalled')}</Text>
          </div>
        )}
      </Card>
    </div>
  );

  return (
    <div>
      {/* 顶部统计区 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>{t('opp_pipeline_total')}</Text>
          <Title level={3} style={{ margin: 0 }}>¥{totalPipelineValue.toLocaleString()}</Title>
        </div>
        <Space>
          <Button icon={<PlusOutlined />} type="primary" onClick={() => setModalOpen(true)}>{t('opp_new')}</Button>
          <Button icon={isAnalyzing ? <SyncOutlined spin /> : <ThunderboltOutlined />} onClick={handleAIAnalysis} loading={isAnalyzing} style={{ background: 'linear-gradient(135deg, #722ed1 0%, #4f46e5 100%)', border: 'none', color: '#fff' }}>
            {isAnalyzing ? t('pipe_analyzing') : t('pipe_ai_audit_btn')}
          </Button>
        </Space>
      </div>

      {/* 漏斗进度条 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          {ACTIVE_STAGES.map((stage, idx) => {
            const count = opportunities.filter(o => o.stage === stage).length;
            const percent = totalActiveCount > 0 ? Math.round((count / totalActiveCount) * 100) : 0;
            return (
              <Col flex={1} key={stage}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ color: STAGE_COLORS[stage], fontWeight: 500 }}>{STAGE_MAP[stage]}</Text>
                  <Progress percent={percent} showInfo={false} strokeColor={STAGE_COLORS[stage]} size="small" />
                  <Text type="secondary" style={{ fontSize: 12 }}>{count} {t('opp_count')}</Text>
                </div>
                {idx < ACTIVE_STAGES.length - 1 && <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', color: '#d9d9d9' }}>→</div>}
              </Col>
            );
          })}
        </Row>
      </Card>

      {pipelineAnalysis && (
        <Alert type="info" showIcon icon={<ThunderboltOutlined />} title={<Text strong>{t('pipe_ai_insights')}</Text>} description={<div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: pipelineAnalysis }} />} style={{ marginBottom: 16, background: '#f0f5ff', border: '1px solid #adc6ff' }} closable onClose={() => setPipelineAnalysis(null)} />
      )}

      <Spin spinning={loading}>
        <DragDropContext onDragEnd={handleDragEnd}>
          {/* 活跃阶段看板 - 自适应宽度 */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            {ACTIVE_STAGES.map((stage) => {
              const items = opportunities.filter((op) => op.stage === stage);
              const stageSum = summary.find(s => s.stage === stage);
              return (
                <div key={stage} style={{ flex: 1, minWidth: 200, maxWidth: 320 }}>
                  <Droppable droppableId={stage}>
                    {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                      <Card size="small" title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Space><Text strong style={{ color: STAGE_COLORS[stage], fontSize: 13 }}>{STAGE_MAP[stage]}</Text><Badge count={items.length} style={{ background: '#f0f0f0', color: '#595959' }} /></Space>
                          {stageSum && <Text type="secondary" style={{ fontSize: 11 }}>¥{Number(stageSum.total_amount).toLocaleString()}</Text>}
                        </div>
                      } style={{ background: snapshot.isDraggingOver ? '#e6f7ff' : '#fafafa', height: '100%', transition: 'background 0.2s' }} styles={{ body: { padding: 8, minHeight: 300 } }}>
                        <div ref={provided.innerRef} {...provided.droppableProps} style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 200 }}>
                          {items.map((op, index) => (
                            <Draggable key={op.id} draggableId={op.id} index={index}>
                              {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => renderOpportunityCard(op, provided, snapshot, false)}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {items.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('opp_no_opp')} style={{ marginTop: 40 }} />}
                        </div>
                      </Card>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>

          {/* 已结束区域 - 折叠面板 */}
          <Collapse ghost items={[{
            key: 'closed',
            label: (
              <Space>
                <Text strong>{t('opp_closed_section')}</Text>
                <Tag color="green" icon={<CheckCircleOutlined />}>{t('opp_won')} {closedWonCount} {t('opp_count')} (¥{closedWonAmount.toLocaleString()})</Tag>
                <Tag color="red" icon={<CloseCircleOutlined />}>{t('opp_lost')} {closedLostCount} {t('opp_count')}</Tag>
              </Space>
            ),
            children: (
              <Row gutter={16}>
                {CLOSED_STAGES.map((stage) => {
                  const items = opportunities.filter((op) => op.stage === stage);
                  return (
                    <Col span={12} key={stage}>
                      <Droppable droppableId={stage}>
                        {(provided: DroppableProvided) => (
                          <Card size="small" title={<Space><Text strong style={{ color: STAGE_COLORS[stage] }}>{STAGE_MAP[stage]}</Text><Badge count={items.length} /></Space>} style={{ background: '#fafafa' }} styles={{ body: { padding: 8, maxHeight: 300, overflowY: 'auto' } }}>
                            <div ref={provided.innerRef} {...provided.droppableProps} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {items.map((op, index) => (
                                <Draggable key={op.id} draggableId={op.id} index={index} isDragDisabled>
                                  {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => renderOpportunityCard(op, provided, snapshot, true)}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                              {items.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('opp_none')} />}
                            </div>
                          </Card>
                        )}
                      </Droppable>
                    </Col>
                  );
                })}
              </Row>
            ),
          }]} />
        </DragDropContext>
      </Spin>

      {/* 新建商机弹窗 */}
      <Modal title={t('opp_create_title')} open={modalOpen} onCancel={() => { setModalOpen(false); form.resetFields(); }} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="customer_id" label={t('opp_customer')} rules={[{ required: true, message: t('opp_select_customer') }]}>
            <Select placeholder={t('opp_select_customer')} showSearch optionFilterProp="label" options={customers.map(c => ({ value: c.id, label: c.company_name }))} />
          </Form.Item>
          <Form.Item name="name" label={t('opp_name')} rules={[{ required: true }]}><Input placeholder={t('opp_name_placeholder')} /></Form.Item>
          <Form.Item name="amount" label={t('opp_amount')}><InputNumber prefix="¥" style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="expected_close_date" label={t('opp_close_date')}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" loading={submitting} block>{t('opp_create_btn')}</Button></Form.Item>
        </Form>
      </Modal>

      {/* 编辑商机弹窗 */}
      <Modal title={t('opp_edit_title')} open={editOpen} onCancel={() => { setEditOpen(false); editForm.resetFields(); }} footer={null}>
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Form.Item name="name" label={t('opp_name')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="amount" label={t('opp_amount')}><InputNumber prefix="¥" style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="expected_close_date" label={t('opp_close_date')}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" loading={submitting} block>{t('opp_save')}</Button></Form.Item>
        </Form>
      </Modal>

      {/* 丢单原因弹窗 */}
      <Modal title={t('opp_loss_title')} open={lossReasonOpen} onCancel={() => { setLossReasonOpen(false); setPendingStage(null); lossForm.resetFields(); }} footer={null}>
        <Form form={lossForm} layout="vertical" onFinish={handleLossConfirm}>
          <Form.Item name="loss_reason" label={t('opp_loss_reason')} rules={[{ required: true, message: t('opp_loss_reason') }]}><TextArea rows={3} placeholder={t('opp_loss_placeholder')} /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" loading={submitting} block danger>{t('opp_loss_confirm')}</Button></Form.Item>
        </Form>
      </Modal>

      {/* 商机详情抽屉 */}
      <Drawer title={selectedOpp?.name || t('opp_detail_title')} open={detailOpen} onClose={() => { setDetailOpen(false); setFollowUps([]); setQuotes([]); }} size="large" extra={
        <Space>
          <Button icon={<EditOutlined />} onClick={() => selectedOpp && handleEdit(selectedOpp)}>{t('edit')}</Button>
          <Popconfirm title={t('opp_confirm_delete')} onConfirm={() => selectedOpp && handleDelete(selectedOpp.id)}><Button danger icon={<DeleteOutlined />}>{t('delete')}</Button></Popconfirm>
        </Space>
      }>
        {selectedOpp && (
          <Spin spinning={detailLoading}>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label={t('opp_name')}>{selectedOpp.name}</Descriptions.Item>
              <Descriptions.Item label={t('opp_customer')}>{selectedOpp.customer_name}</Descriptions.Item>
              <Descriptions.Item label={t('opp_amount')}><Text style={{ color: '#52c41a', fontWeight: 500 }}>¥{Number(selectedOpp.amount || 0).toLocaleString()}</Text></Descriptions.Item>
              <Descriptions.Item label={t('opp_win_rate')}><Tag color={STAGE_COLORS[selectedOpp.stage]}>{selectedOpp.probability}%</Tag></Descriptions.Item>
              <Descriptions.Item label={t('opp_current_stage')}><Tag color={STAGE_COLORS[selectedOpp.stage]}>{STAGE_MAP[selectedOpp.stage]}</Tag></Descriptions.Item>
              <Descriptions.Item label={t('opp_close_date')}>{selectedOpp.expected_close_date ? dayjs(selectedOpp.expected_close_date).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
              <Descriptions.Item label={t('opp_owner')}>{selectedOpp.owner_name || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('opp_created_at')}>{selectedOpp.created_at?.split('T')[0] || '-'}</Descriptions.Item>
              {selectedOpp.loss_reason && <Descriptions.Item label={t('opp_loss_reason')} span={2}><Text type="danger">{selectedOpp.loss_reason}</Text></Descriptions.Item>}
            </Descriptions>
            {selectedOpp.stage !== 'closed_won' && selectedOpp.stage !== 'closed_lost' && (
              <div style={{ marginTop: 16 }}>
                <Text strong style={{ marginBottom: 8, display: 'block' }}>{t('opp_advance_stage')}</Text>
                <Space wrap>
                  {[...ACTIVE_STAGES, 'closed_won'].map(s => (
                    <Button key={s} type={selectedOpp.stage === s ? 'primary' : 'default'} size="small" onClick={() => handleStageChange(selectedOpp.id, s)} disabled={selectedOpp.stage === s}>{STAGE_MAP[s]}</Button>
                  ))}
                  <Button danger size="small" onClick={() => handleStageChange(selectedOpp.id, 'closed_lost')}>{t('opp_mark_lost')}</Button>
                </Space>
              </div>
            )}
            {selectedOpp.stage === 'closed_won' && (
              <div style={{ marginTop: 16, padding: 12, background: '#f6ffed', borderRadius: 8, textAlign: 'center' }}>
                <DollarOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                <Text strong style={{ color: '#52c41a', marginLeft: 8 }}>{t('opp_congrats')}</Text>
              </div>
            )}
            <Tabs style={{ marginTop: 16 }} items={[
              {
                key: 'followups', label: <span><PhoneOutlined /> {t('opp_tab_followups')} ({followUps.length})</span>, children: (
                  <div>
                    <Form form={followUpForm} layout="inline" onFinish={handleAddFollowUp} style={{ marginBottom: 16 }}>
                      <Form.Item name="type" rules={[{ required: true }]} style={{ width: 100 }}>
                        <Select placeholder={t('opp_followup_type')} options={[{ value: 'call', label: t('task_type_call') }, { value: 'visit', label: t('task_type_visit') }, { value: 'email', label: t('task_type_email') }, { value: 'other', label: t('task_type_other') }]} />
                      </Form.Item>
                      <Form.Item name="content" rules={[{ required: true }]} style={{ flex: 1 }}>
                        <Input placeholder={t('opp_followup_placeholder')} />
                      </Form.Item>
                      <Form.Item><Button type="primary" htmlType="submit" loading={submitting}>{t('add')}</Button></Form.Item>
                    </Form>
                    {followUps.length > 0 ? (
                      <Timeline items={followUps.map(f => ({
                        color: FOLLOW_TYPE_MAP[f.type]?.color || '#8c8c8c',
                        dot: FOLLOW_TYPE_MAP[f.type]?.icon,
                        children: (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Tag color={FOLLOW_TYPE_MAP[f.type]?.color}>{FOLLOW_TYPE_MAP[f.type]?.label}</Tag>
                              <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(f.created_at).format('YYYY-MM-DD HH:mm')}</Text>
                            </div>
                            <div style={{ marginTop: 4 }}>{f.content}</div>
                            <Text type="secondary" style={{ fontSize: 11 }}>{f.user_name}</Text>
                          </div>
                        ),
                      }))} />
                    ) : <Empty description={t('opp_no_followups')} image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                  </div>
                )
              },
              {
                key: 'quotes', label: <span><FileTextOutlined /> {t('opp_tab_quotes')} ({quotes.length})</span>, children: (
                  <div>
                    {quotes.length > 0 ? (
                      <List size="small" dataSource={quotes} renderItem={q => (
                        <List.Item>
                          <div style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text strong>{q.quote_number}</Text>
                              <Tag color={QUOTE_STATUS_MAP[q.status]?.color}>{QUOTE_STATUS_MAP[q.status]?.label}</Tag>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                              <Text style={{ color: '#52c41a' }}>¥{Number(q.total_amount || 0).toLocaleString()}</Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(q.created_at).format('YYYY-MM-DD')}</Text>
                            </div>
                          </div>
                        </List.Item>
                      )} />
                    ) : <Empty description={t('opp_no_quotes')} image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                  </div>
                )
              },
            ]} />
          </Spin>
        )}
      </Drawer>
    </div>
  );
};

export default OpportunityBoard;
