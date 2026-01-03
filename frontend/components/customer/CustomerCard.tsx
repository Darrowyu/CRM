import React, { useState } from 'react';
import { Card, Tag, Space, Typography, Checkbox, Button, Popconfirm } from 'antd';
import { EnvironmentOutlined, PhoneOutlined, UserOutlined, MailOutlined } from '@ant-design/icons';
import { Customer } from '../../services/customerService';
import { getRegionLabel } from './constants';
import dayjs from 'dayjs';

const { Text } = Typography;

const BuildingIcon: React.FC<{ color?: string }> = ({ color = '#8c8c8c' }) => ( // 建筑物图标
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="3" width="8" height="18" rx="1" /><rect x="12" y="9" width="8" height="12" rx="1" />
    <line x1="7" y1="7" x2="9" y2="7" /><line x1="7" y1="11" x2="9" y2="11" />
    <path d="M7 18v3h2v-3" /><path d="M15 13h2" /><path d="M15 17h2" />
  </svg>
);

interface Props {
  customer: Customer;
  selected: boolean;
  onSelect: () => void;
  onView: () => void;
  onClaim: () => void;
  onRelease: () => void;
  isPublicPool: boolean;
  loading: boolean;
  t: (key: string) => string;
}

const CustomerCard: React.FC<Props> = ({ customer, selected, onSelect, onView, onClaim, onRelease, isPublicPool, loading, t }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <Card hoverable onClick={onView} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ cursor: 'pointer', borderRadius: 12, transition: 'all 0.3s ease', opacity: loading ? 0.6 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Checkbox checked={selected} onClick={(e) => { e.stopPropagation(); onSelect(); }} />
          <div style={{ width: 40, height: 40, borderRadius: 8, background: hovered ? '#e6f7ff' : '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease' }}><BuildingIcon color={hovered ? '#1677ff' : '#8c8c8c'} /></div>
        </div>
        <Tag color="orange" style={{ borderRadius: 12, border: 'none', background: '#fff7e6', color: '#fa8c16' }}>{customer.industry || '-'}</Tag>
      </div>
      <Text strong style={{ fontSize: 18, display: 'block', marginBottom: 12 }}>{customer.company_name}</Text>
      <div style={{ marginBottom: 16 }}><Space><EnvironmentOutlined style={{ color: '#8c8c8c' }} /><Text type="secondary">{getRegionLabel(customer.region)}</Text></Space></div>
      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
        {customer.contacts?.slice(0, 1).map((contact) => (
          <div key={contact.id}>
            <div style={{ marginBottom: 8 }}><Space><UserOutlined style={{ color: '#8c8c8c' }} /><Text strong>{contact.name}</Text>{contact.role && <Tag style={{ borderRadius: 4, background: '#f5f5f5', border: 'none' }}>{contact.role}</Tag>}</Space></div>
            <div style={{ marginBottom: 4 }}><Space><PhoneOutlined style={{ color: '#8c8c8c' }} /><Text type="secondary">{contact.phone || '-'}</Text></Space></div>
            {contact.email && <div><Space><MailOutlined style={{ color: '#8c8c8c' }} /><Text type="secondary" style={{ fontSize: 13 }}>{contact.email}</Text></Space></div>}
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 16, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: isPublicPool ? '#fa8c16' : '#8c8c8c' }}>{t('cust_last_contact')}: {customer.last_contact_date ? dayjs(customer.last_contact_date).format('YYYY-MM-DD') : '-'}</Text>
        {isPublicPool ? (
          <Button type="link" style={{ color: '#fa8c16', fontWeight: 500, padding: 0 }} onClick={(e) => { e.stopPropagation(); onClaim(); }}>{t('cust_claim_btn')}</Button>
        ) : (
          <Popconfirm title={t('confirm')} onConfirm={onRelease}><Button type="link" size="small" danger onClick={(e) => e.stopPropagation()}>{t('cust_release_btn')}</Button></Popconfirm>
        )}
      </div>
    </Card>
  );
};

export default CustomerCard;
