import React from 'react';
import { Drawer, Tabs, Descriptions, Tag, Card, Row, Col, Table, Timeline, Empty, Space, Button, Popconfirm, Avatar, Typography } from 'antd';
import { BankOutlined, TeamOutlined, HistoryOutlined, FundOutlined, FileTextOutlined, ShoppingCartOutlined, EditOutlined, DeleteOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Customer, Contact, FollowUp } from '../../services/customerService';
import { SOURCE_MAP, STAGE_MAP, FOLLOW_TYPE_MAP, getRegionLabel } from './constants';
import { useLanguage } from '../../contexts/LanguageContext';
import dayjs from 'dayjs';

const { Text } = Typography;

const STAGE_COLORS: Record<string, string> = { prospecting: '#1890ff', qualification: '#13c2c2', proposal: '#52c41a', negotiation: '#faad14', closed_won: '#52c41a', closed_lost: '#ff4d4f' };
const FOLLOW_COLORS: Record<string, string> = { call: '#1890ff', visit: '#52c41a', email: '#faad14', other: '#8c8c8c' };

interface Props {
  open: boolean;
  customer: Customer | null;
  activeTab: string;
  onClose: () => void;
  onTabChange: (key: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddContact: () => void;
  onAddFollowUp: () => void;
  onSetPrimary: (id: string) => void;
  onDeleteContact: (id: string) => void;
  isPrivate: boolean;
}

const CustomerDetailDrawer: React.FC<Props> = ({ open, customer, activeTab, onClose, onTabChange, onEdit, onDelete, onAddContact, onAddFollowUp, onSetPrimary, onDeleteContact, isPrivate }) => {
  const { t } = useLanguage();
  if (!customer) return null;
  const opps = customer.opportunities || [];
  const followUps = customer.follow_ups || [];
  const totalOppAmount = opps.reduce((sum, o: any) => sum + (Number(o.amount) || 0), 0);
  const stageGroups = opps.reduce((acc: Record<string, number>, o: any) => { acc[o.stage] = (acc[o.stage] || 0) + 1; return acc; }, {});
  const followTypeGroups = followUps.reduce((acc: Record<string, number>, f: FollowUp) => { acc[f.type] = (acc[f.type] || 0) + 1; return acc; }, {});

  return (
    <Drawer title={customer.company_name || t('cust_detail_title')} open={open} onClose={onClose} size="large" extra={isPrivate && <Space><Button type="primary" icon={<EditOutlined />} onClick={onEdit}>{t('edit')}</Button><Popconfirm title={t('cust_confirm_delete_customer')} onConfirm={onDelete}><Button danger icon={<DeleteOutlined />}>{t('delete')}</Button></Popconfirm></Space>}>
      <Tabs activeKey={activeTab} onChange={onTabChange} items={[
        { key: 'info', label: <><BankOutlined /> {t('cust_tab_info')}</>, children: (
          <div>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label={t('cust_company')}>{customer.company_name}</Descriptions.Item>
              <Descriptions.Item label={t('cust_industry')}><Tag color="blue">{customer.industry || '-'}</Tag></Descriptions.Item>
              <Descriptions.Item label={t('cust_country')}>{getRegionLabel(customer.region)}</Descriptions.Item>
              <Descriptions.Item label={t('cust_source')}>{customer.source ? SOURCE_MAP[customer.source] : '-'}</Descriptions.Item>
              <Descriptions.Item label={t('cust_status')}><Tag color={customer.status === 'private' ? 'green' : 'orange'}>{customer.status === 'private' ? t('cust_status_private') : t('cust_status_public')}</Tag></Descriptions.Item>
              <Descriptions.Item label={t('cust_owner')}>{customer.owner_name || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('cust_last_contact')}>{customer.last_contact_date ? dayjs(customer.last_contact_date).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
              <Descriptions.Item label={t('cust_created')}>{customer.created_at?.split('T')[0] || '-'}</Descriptions.Item>
            </Descriptions>
            <Row gutter={16} style={{ marginTop: 24 }}>
              <Col span={12}>
                <Card size="small" title={<><FundOutlined /> {t('cust_opp_stage_dist')}</>}>
                  {opps.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PieChart width={180} height={180}><Pie data={Object.entries(stageGroups).map(([stage, value]) => ({ name: STAGE_MAP[stage] || stage, value, fill: STAGE_COLORS[stage] || '#8c8c8c' }))} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">{Object.entries(stageGroups).map(([stage], i) => <Cell key={i} fill={STAGE_COLORS[stage] || '#8c8c8c'} />)}</Pie><Tooltip formatter={(value: number) => [`${value} ${t('cust_count')}`, t('cust_opp_amount')]} /></PieChart>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 8 }}>
                        {Object.entries(stageGroups).map(([stage, count]) => (<div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: STAGE_COLORS[stage] || '#8c8c8c' }} /><Text style={{ fontSize: 11 }}>{STAGE_MAP[stage]}</Text><Text strong style={{ fontSize: 11 }}>({count})</Text></div>))}
                        <div style={{ marginTop: 8, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}><Text type="secondary" style={{ fontSize: 11 }}>{t('cust_total_amount')}: </Text><Text strong style={{ color: '#52c41a', fontSize: 12 }}>¥{totalOppAmount.toLocaleString()}</Text></div>
                      </div>
                    </div>
                  ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('cust_no_opp')} />}
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title={<><HistoryOutlined /> {t('cust_followup_type_dist')}</>}>
                  {followUps.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PieChart width={180} height={180}><Pie data={Object.entries(followTypeGroups).map(([type, value]) => ({ name: FOLLOW_TYPE_MAP[type] || type, value, fill: FOLLOW_COLORS[type] || '#8c8c8c' }))} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">{Object.entries(followTypeGroups).map(([type], i) => <Cell key={i} fill={FOLLOW_COLORS[type] || '#8c8c8c'} />)}</Pie><Tooltip formatter={(value: number) => [`${value} ${t('cust_times')}`, t('cust_times')]} /></PieChart>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 8 }}>
                        {Object.entries(followTypeGroups).map(([type, count]) => (<div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: FOLLOW_COLORS[type] || '#8c8c8c' }} /><Text style={{ fontSize: 11 }}>{FOLLOW_TYPE_MAP[type]}</Text><Text strong style={{ fontSize: 11 }}>({count})</Text></div>))}
                        <div style={{ marginTop: 8, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}><Text type="secondary" style={{ fontSize: 11 }}>{t('cust_total_followup')}: </Text><Text strong style={{ fontSize: 12 }}>{followUps.length} {t('cust_times')}</Text></div>
                      </div>
                    </div>
                  ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('cust_no_followup')} />}
                </Card>
              </Col>
            </Row>
          </div>
        )},
        { key: 'contacts', label: <><TeamOutlined /> {t('cust_tab_contacts')} ({customer.contacts?.length || 0})</>, children: (
          <div>
            <Button type="dashed" icon={<PlusOutlined />} onClick={onAddContact} style={{ marginBottom: 16 }}>{t('cust_add_contact')}</Button>
            <Table size="small" dataSource={customer.contacts || []} rowKey="id" pagination={false} columns={[
              { title: t('cust_name'), dataIndex: 'name', render: (v: string, r: Contact) => <Space><Avatar size="small" icon={<UserOutlined />} />{v}{r.role && <Tag>{r.role}</Tag>}{r.is_primary && <Tag color="gold">{t('cust_primary_contact')}</Tag>}</Space> },
              { title: t('cust_phone'), dataIndex: 'phone' },
              { title: t('cust_email'), dataIndex: 'email', render: (v: string) => v || '-' },
              { title: t('actions'), key: 'action', width: 150, render: (_: any, r: Contact) => <Space>{!r.is_primary && <Button type="link" size="small" onClick={() => onSetPrimary(r.id)}>{t('cust_set_primary')}</Button>}<Popconfirm title={t('msg_confirm_delete')} onConfirm={() => onDeleteContact(r.id)}><Button type="link" size="small" danger>{t('delete')}</Button></Popconfirm></Space> },
            ]} />
          </div>
        )},
        { key: 'followups', label: <><HistoryOutlined /> {t('cust_tab_followups')} ({followUps.length})</>, children: (
          <div>
            <Button type="dashed" icon={<PlusOutlined />} onClick={onAddFollowUp} style={{ marginBottom: 16 }}>{t('cust_followup_add')}</Button>
            <Timeline items={followUps.map((f: FollowUp) => ({ color: f.type === 'visit' ? 'green' : f.type === 'call' ? 'blue' : 'gray', title: f.created_at?.split('T')[0], content: <div><Space><Tag>{FOLLOW_TYPE_MAP[f.type] || f.type}</Tag><Text type="secondary">by {f.user_name}</Text></Space><div style={{ marginTop: 8 }}>{f.content}</div></div> }))} />
          </div>
        )},
        { key: 'opportunities', label: <><FundOutlined /> {t('cust_tab_opportunities')} ({opps.length})</>, children: (
          <Table size="small" dataSource={opps} rowKey="id" pagination={false} locale={{ emptyText: t('cust_no_opp') }} columns={[
            { title: t('cust_opp_name'), dataIndex: 'name' },
            { title: t('cust_opp_stage'), dataIndex: 'stage', render: (v: string) => <Tag color="blue">{STAGE_MAP[v] || v}</Tag> },
            { title: t('cust_opp_amount'), dataIndex: 'amount', render: (v: number) => `¥${v?.toLocaleString()}` },
            { title: t('cust_opp_probability'), dataIndex: 'probability', render: (v: number) => `${v}%` },
          ]} />
        )},
        { key: 'quotes', label: <><FileTextOutlined /> {t('cust_tab_quotes')} ({customer.quotes?.length || 0})</>, children: (
          <Table size="small" dataSource={customer.quotes || []} rowKey="id" pagination={false} locale={{ emptyText: t('cust_no_quote') }} columns={[
            { title: t('cust_quote_number'), dataIndex: 'quote_number' },
            { title: t('cust_status'), dataIndex: 'status', render: (v: string) => <Tag>{v}</Tag> },
            { title: t('cust_opp_amount'), dataIndex: 'total_amount', render: (v: number) => `¥${v?.toLocaleString()}` },
            { title: t('field_date'), dataIndex: 'created_at', render: (v: string) => v?.split('T')[0] },
          ]} />
        )},
        { key: 'orders', label: <><ShoppingCartOutlined /> {t('cust_tab_orders')} ({customer.orders?.length || 0})</>, children: (
          <Table size="small" dataSource={customer.orders || []} rowKey="id" pagination={false} locale={{ emptyText: t('cust_no_order') }} columns={[
            { title: t('cust_order_number'), dataIndex: 'order_number' },
            { title: t('cust_status'), dataIndex: 'status', render: (v: string) => <Tag color={v === 'completed' ? 'green' : 'blue'}>{v}</Tag> },
            { title: t('cust_opp_amount'), dataIndex: 'total_amount', render: (v: number) => `¥${v?.toLocaleString()}` },
            { title: t('cust_payment_status'), dataIndex: 'payment_status', render: (v: string) => <Tag color={v === 'paid' ? 'green' : 'orange'}>{v}</Tag> },
          ]} />
        )},
      ]} />
    </Drawer>
  );
};

export default CustomerDetailDrawer;
