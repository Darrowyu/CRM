import React, { useState } from 'react';
import { Card, Button, Row, Col, Spin, Typography, Space, Tag, Alert, Progress, App, Flex, InputNumber, Statistic, theme, Avatar } from 'antd';
import {
    ThunderboltFilled,
    WarningOutlined,
    TeamOutlined,
    StarFilled,
    ClearOutlined,
    RightOutlined,
    SafetyCertificateFilled,
    ReadFilled
} from '@ant-design/icons';
import { agentService, PipelineHealth, StaleCustomersResult, AtRiskResult } from '../../services/agentService';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const { Title, Text, Paragraph } = Typography;

// --- 子组件：功能操作卡片 ---
interface ActionCardProps {
    title: string;
    desc: string;
    icon: React.ReactNode;
    color: string;
    loading: boolean;
    onClick: () => void;
    extra?: React.ReactNode;
    disabled?: boolean;
    highlight?: boolean;
    highlightText?: string;
}

const ActionCard: React.FC<ActionCardProps> = ({ title, desc, icon, color, loading, onClick, extra, disabled, highlight, highlightText }) => {
    const { token } = theme.useToken();

    return (
        <Card
            hoverable={!disabled}
            onClick={!disabled ? onClick : undefined}
            style={{
                height: '100%',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                borderColor: highlight ? color : token.colorBorderSecondary,
                background: highlight ? `linear-gradient(145deg, ${token.colorBgContainer}, ${token.colorBgLayout})` : token.colorBgContainer,
                position: 'relative',
                overflow: 'hidden'
            }}
            styles={{ body: { padding: 20, height: '100%', display: 'flex', flexDirection: 'column' } }}
        >
            {loading && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Spin indicator={<ThunderboltFilled style={{ fontSize: 24, color }} spin />} />
                </div>
            )}
            <Flex justify="space-between" align="start" style={{ marginBottom: 12 }}>
                <Avatar
                    icon={icon}
                    shape="square"
                    size={48}
                    style={{ backgroundColor: `${color}15`, color: color, fontSize: 24, borderRadius: 12 }}
                />
                {highlight && <Tag color={color} style={{ margin: 0, borderRadius: 100 }}>{highlightText}</Tag>}
            </Flex>
            <div style={{ flex: 1 }}>
                <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>{title}</Text>
                <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.4, display: 'block' }}>{desc}</Text>
            </div>
            {extra && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${token.colorSplit}` }} onClick={e => e.stopPropagation()}>
                    {extra}
                </div>
            )}
            {!disabled && !extra && (
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', opacity: 0.5 }}>
                    <RightOutlined style={{ fontSize: 12 }} />
                </div>
            )}
        </Card>
    );
};

// --- 主组件 ---
const AgentPanel: React.FC = () => {
    const { message } = App.useApp();
    const { hasPermission } = useAuth();
    const { t } = useLanguage();
    const { token } = theme.useToken();

    // 状态管理
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
    const [pipelineHealth, setPipelineHealth] = useState<PipelineHealth | null>(null);
    const [staleCustomers, setStaleCustomers] = useState<StaleCustomersResult | null>(null);
    const [atRiskOpps, setAtRiskOpps] = useState<AtRiskResult | null>(null);
    const [dailySummary, setDailySummary] = useState<string | null>(null);
    const [scoringResults, setScoringResults] = useState<{ customerId: string; companyName: string; score: number; grade: string }[] | null>(null);

    // 参数设置
    const [batchLimit, setBatchLimit] = useState(5);
    const [staleDays, setStaleDays] = useState(30);

    // 权限检查（基于动态权限系统）
    const canReactivate = hasPermission('agent:reactivation');
    const canScore = hasPermission('agent:scoring');

    // 统一处理函数
    const handleAction = async (key: string, action: () => Promise<any>, successMsg: string) => {
        setLoadingMap(prev => ({ ...prev, [key]: true }));
        try {
            await action();
            message.success(successMsg);
        } catch (e: any) {
            message.error(e.message || t('error'));
        } finally {
            setLoadingMap(prev => ({ ...prev, [key]: false }));
        }
    };

    const clearResults = () => {
        setPipelineHealth(null);
        setAtRiskOpps(null);
        setDailySummary(null);
        setStaleCustomers(null);
        setScoringResults(null);
    };

    const hasResults = pipelineHealth || atRiskOpps || dailySummary || staleCustomers || scoringResults;

    // 辅助函数
    const getGradeInfo = (grade: string) => {
        const map: Record<string, string> = { A: '#52c41a', B: '#1890ff', C: '#faad14', D: '#ff4d4f' };
        return { color: map[grade] || '#d9d9d9', text: `${grade}${t('agent_grade_customer')}` };
    };

    return (
        <div style={{ maxWidth: 1600, margin: '0 auto', padding: 24 }}>
            {/* 头部 */}
            <Flex justify="space-between" align="center" style={{ marginBottom: 32 }}>
                <div>
                    <Title level={2} style={{ margin: 0, fontWeight: 700 }}>{t('agent_title')}</Title>
                    <Text type="secondary">{t('agent_subtitle')} / Model: Gemini Pro</Text>
                </div>
                {hasResults && (
                    <Button icon={<ClearOutlined />} onClick={clearResults} type="text">{t('agent_clear_results')}</Button>
                )}
            </Flex>

            {/* 第一行：智能洞察 (3列) */}
            <Row gutter={[24, 24]} align="stretch" style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={8}>
                    <ActionCard
                        title={t('agent_pipeline_health')}
                        desc={t('agent_pipeline_desc')}
                        icon={<SafetyCertificateFilled />}
                        color="#2563eb"
                        loading={!!loadingMap['pipeline']}
                        onClick={() => handleAction('pipeline', async () => setPipelineHealth(await agentService.getPipelineHealth()), t('success'))}
                    />
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <ActionCard
                        title={t('agent_at_risk')}
                        desc={t('agent_at_risk_desc')}
                        icon={<WarningOutlined />}
                        color="#faad14"
                        loading={!!loadingMap['atRisk']}
                        onClick={() => handleAction('atRisk', async () => setAtRiskOpps(await agentService.getAtRiskOpportunities()), t('success'))}
                    />
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <ActionCard
                        title={t('agent_daily_summary')}
                        desc={t('agent_daily_desc')}
                        icon={<ReadFilled />}
                        color="#52c41a"
                        loading={!!loadingMap['summary']}
                        onClick={() => handleAction('summary', async () => setDailySummary(await agentService.getDailySummary()), t('success'))}
                    />
                </Col>
            </Row>

            {/* 第二行：主动干预 (2列，空间更宽裕以容纳输入框) */}
            <Row gutter={[24, 24]} align="stretch" style={{ marginBottom: 40 }}>
                <Col xs={24} lg={12}>
                    <ActionCard
                        title={t('agent_reactivation')}
                        desc={t('agent_reactivation_desc')}
                        icon={<TeamOutlined />}
                        color="#13c2c2"
                        loading={!!loadingMap['reactivation']}
                        disabled={!canReactivate}
                        onClick={() => handleAction('reactivation', async () => setStaleCustomers(await agentService.analyzeStaleCustomers(staleDays)), t('success'))}
                        extra={
                            <Flex align="center" justify="space-between">
                                <Text type="secondary" style={{ fontSize: 13 }}>{t('agent_filter_days')}</Text>
                                <Space.Compact>
                                    <InputNumber min={7} max={180} value={staleDays} onChange={v => setStaleDays(v || 30)} disabled={!canReactivate} style={{ width: 80 }} />
                                    <Button disabled>{t('agent_days')}</Button>
                                </Space.Compact>
                            </Flex>
                        }
                    />
                </Col>
                <Col xs={24} lg={12}>
                    <ActionCard
                        title={t('agent_scoring')}
                        desc={t('agent_scoring_desc')}
                        icon={<StarFilled />}
                        color="#eb2f96"
                        loading={!!loadingMap['scoring']}
                        disabled={!canScore}
                        onClick={() => handleAction('scoring', async () => setScoringResults(await agentService.autoScoreCustomers(batchLimit)), t('success'))}
                        extra={
                            <Flex align="center" justify="space-between">
                                <Text type="secondary" style={{ fontSize: 13 }}>{t('agent_batch_count')}</Text>
                                <Space.Compact>
                                    <InputNumber
                                        min={1} max={20} value={batchLimit} onChange={v => setBatchLimit(v || 5)}
                                        style={{ width: 80 }}
                                        disabled={!canScore}
                                    />
                                    <Button disabled>{t('agent_customers')}</Button>
                                </Space.Compact>
                            </Flex>
                        }
                    />
                </Col>
            </Row>



            {/* 结果展示看板 */}
            {hasResults && (
                <div style={{ animation: 'fadeIn 0.5s ease' }}>
                    <Flex align="center" gap={16} style={{ margin: '24px 0' }}>
                        <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' }}>{t('agent_results')}</Text>
                        <div style={{ height: 1, flex: 1, background: token.colorSplit }} />
                    </Flex>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
                        {/* 评分结果 */}
                        {scoringResults && (
                            <Card title={<Space><StarFilled style={{ color: '#eb2f96' }} />{t('agent_scoring_results')}</Space>} style={{ gridColumn: '1 / -1' }}>
                                <Flex wrap="wrap" gap={24}>
                                    {scoringResults.map((r, i) => (
                                        <Card key={i} size="small" style={{ width: 220, borderColor: getGradeInfo(r.grade).color }} styles={{ body: { padding: 16 } }}>
                                            <Statistic
                                                title={<Text strong style={{ fontSize: 13 }}>{r.companyName || t('agent_unnamed')}</Text>}
                                                value={r.score}
                                                groupSeparator=""
                                                styles={{ content: { color: getGradeInfo(r.grade).color, fontSize: 28, fontWeight: 700 } }}
                                                suffix={<Text type="secondary" style={{ fontSize: 14 }}>pts</Text>}
                                            />
                                            <Tag color={getGradeInfo(r.grade).color} style={{ marginTop: 8 }}>{r.grade}{t('agent_grade_customer')}</Tag>
                                        </Card>
                                    ))}
                                </Flex>
                            </Card>
                        )}

                        {/* 管道健康 */}
                        {pipelineHealth && (
                            <Card title={<Space><SafetyCertificateFilled style={{ color: '#2563eb' }} />{t('agent_pipeline_report')}</Space>}>
                                <Flex align="center" gap={32} style={{ padding: 24 }}>
                                    <Progress type="circle" percent={pipelineHealth.score} size={120} strokeColor={pipelineHealth.score >= 80 ? '#52c41a' : '#faad14'} />
                                    <Flex vertical flex={1} gap={8}>
                                        {pipelineHealth.issues.length ? pipelineHealth.issues.map((issue, i) => (
                                            <Alert key={i} title={issue} type="warning" showIcon style={{ padding: '8px 12px' }} />
                                        )) : <Alert title={t('agent_pipeline_healthy')} type="success" showIcon />}
                                    </Flex>
                                </Flex>
                            </Card>
                        )}

                        {/* 风险商机 */}
                        {atRiskOpps && (
                            <Card title={<Space><WarningOutlined style={{ color: '#faad14' }} />{t('agent_risk_list')}</Space>}>
                                <Flex vertical gap={12}>
                                    {atRiskOpps.opportunities.length ? atRiskOpps.opportunities.slice(0, 5).map((opp, i) => (
                                        <div key={i} style={{ padding: 12, borderRadius: 8, background: token.colorFillAlter, border: `1px solid ${token.colorBorderSecondary}` }}>
                                            <Flex justify="space-between" style={{ marginBottom: 4 }}>
                                                <Text strong>{opp.company_name}</Text>
                                                <Tag color="red">{t('agent_win_rate')} {opp.probability}%</Tag>
                                            </Flex>
                                            <Text type="secondary" style={{ fontSize: 12 }}>{opp.name} · ¥{(Number(opp.amount) / 10000).toFixed(1)}W</Text>
                                        </div>
                                    )) : <Alert title={t('agent_no_risk')} type="success" showIcon />}
                                    {atRiskOpps.analysis && <Alert title={atRiskOpps.analysis} type="info" style={{ marginTop: 8 }} />}
                                </Flex>
                            </Card>
                        )}

                        {/* 每日摘要 */}
                        {dailySummary && (
                            <Card title={<Space><ReadFilled style={{ color: '#52c41a' }} />{t('agent_today_summary')}</Space>}>
                                <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: 20 }}>
                                    <Paragraph style={{ marginBottom: 0, fontSize: 15, lineHeight: 1.8 }}>{dailySummary}</Paragraph>
                                </div>
                            </Card>
                        )}

                        {/* 沉睡客户 */}
                        {staleCustomers && (
                            <Card title={<Space><TeamOutlined style={{ color: '#13c2c2' }} />{t('agent_dormant_customers')}</Space>}>
                                <Flex vertical gap={8}>
                                    {staleCustomers.customers.map((c, i) => (
                                        <Tag key={i} style={{ padding: '8px 12px', fontSize: 14, display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{c.company_name}</span>
                                            <RightOutlined style={{ fontSize: 10, color: token.colorTextQuaternary }} />
                                        </Tag>
                                    ))}
                                </Flex>
                                {staleCustomers.suggestions.length > 0 && (
                                    <div style={{ marginTop: 16, padding: 12, background: token.colorFillAlter, borderRadius: 8 }}>
                                        <Text strong style={{ fontSize: 12, color: token.colorTextSecondary }}>AI Suggestions:</Text>
                                        <ul style={{ paddingLeft: 20, margin: '8px 0 0 0', fontSize: 13 }}>
                                            {staleCustomers.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </Card>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentPanel;
