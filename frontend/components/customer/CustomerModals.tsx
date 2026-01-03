import React from 'react';
import { Modal, Form, Input, Select, Row, Col, Table, DatePicker, Drawer, Tabs, Button, Space, Tag, Avatar, Popconfirm } from 'antd';
import { BankOutlined, TeamOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons';
import { Customer, Contact, CreateCustomerDTO } from '../../services/customerService';
import { MARKET_REGIONS, REGION_COUNTRIES, SOURCE_OPTIONS, INDUSTRY_OPTIONS, FOLLOW_TYPE_OPTIONS, SOURCE_MAP, getRegionLabel } from './constants';

const { TextArea } = Input;

interface CreateModalProps { // 新建客户弹窗
  open: boolean;
  form: any;
  submitting: boolean;
  selectedMarket: string;
  onCancel: () => void;
  onFinish: (values: CreateCustomerDTO) => void;
  onMarketChange: (val: string) => void;
  t: (key: string) => string;
}

export const CreateCustomerModal: React.FC<CreateModalProps> = ({ open, form, submitting, selectedMarket, onCancel, onFinish, onMarketChange, t }) => (
  <Modal title={t('cust_add_btn')} open={open} onCancel={onCancel} footer={null} width={600}>
    <Form form={form} layout="vertical" onFinish={onFinish}>
      <Form.Item name="company_name" label={t('cust_company')} rules={[{ required: true }]}><Input /></Form.Item>
      <Row gutter={16}>
        <Col span={12}><Form.Item name="contact_name" label={t('cust_contact')} rules={[{ required: true }]}><Input /></Form.Item></Col>
        <Col span={12}><Form.Item name="contact_role" label={t('cust_role')}><Input /></Form.Item></Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}><Form.Item name="phone" label={t('cust_phone')} rules={[{ required: true }]}><Input /></Form.Item></Col>
        <Col span={12}><Form.Item name="email" label={t('cust_email')}><Input /></Form.Item></Col>
      </Row>
      <Form.Item name="industry" label={t('cust_industry')}><Select options={INDUSTRY_OPTIONS} /></Form.Item>
      <Row gutter={16}>
        <Col span={12}><Form.Item name="market_region" label={t('cust_market_region')}><Select options={MARKET_REGIONS} onChange={onMarketChange} /></Form.Item></Col>
        <Col span={12}><Form.Item name="region" label={t('cust_country')}><Select options={selectedMarket ? REGION_COUNTRIES[selectedMarket] : []} disabled={!selectedMarket} /></Form.Item></Col>
      </Row>
      <Form.Item name="source" label={t('cust_source')}><Select options={SOURCE_OPTIONS} /></Form.Item>
      <Form.Item><Button type="primary" htmlType="submit" loading={submitting} block>{t('save')}</Button></Form.Item>
    </Form>
  </Modal>
);

interface EditDrawerProps { // 编辑客户抽屉
  open: boolean;
  form: any;
  submitting: boolean;
  editMarket: string;
  customer: Customer | null;
  onClose: () => void;
  onFinish: (values: Partial<Customer>) => void;
  onMarketChange: (val: string) => void;
  onAddContact: () => void;
  onEditContact: (contact: Contact) => void;
  onSetPrimary: (id: string) => void;
  onDeleteContact: (id: string) => void;
  t: (key: string) => string;
}

export const EditCustomerDrawer: React.FC<EditDrawerProps> = ({ open, form, submitting, editMarket, customer, onClose, onFinish, onMarketChange, onAddContact, onEditContact, onSetPrimary, onDeleteContact, t }) => (
  <Drawer title={t('cust_edit')} open={open} onClose={onClose} size="large">
    <Tabs items={[
      { key: 'basic', label: <><BankOutlined /> {t('cust_basic_info')}</>, children: (
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="company_name" label={t('cust_company')} rules={[{ required: true }]}><Input /></Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="industry" label={t('cust_industry')}><Select options={INDUSTRY_OPTIONS} /></Form.Item></Col>
            <Col span={12}><Form.Item name="source" label={t('cust_source')}><Select options={SOURCE_OPTIONS} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="market_region" label={t('cust_market_region')}><Select options={MARKET_REGIONS} onChange={onMarketChange} /></Form.Item></Col>
            <Col span={12}><Form.Item name="region" label={t('cust_country')}><Select options={editMarket ? REGION_COUNTRIES[editMarket] : []} disabled={!editMarket} /></Form.Item></Col>
          </Row>
          <Form.Item name="last_contact_date" label={t('cust_last_contact_date')}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" loading={submitting} block>{t('save')}</Button></Form.Item>
        </Form>
      )},
      { key: 'contacts', label: <><TeamOutlined /> {t('cust_contact_manage')}</>, children: (
        <div>
          <Button type="dashed" icon={<PlusOutlined />} onClick={onAddContact} style={{ marginBottom: 16 }}>{t('cust_add_contact')}</Button>
          <Table size="small" dataSource={customer?.contacts || []} rowKey="id" pagination={false} columns={[
            { title: t('cust_name'), dataIndex: 'name', render: (v: string, r: Contact) => <Space><Avatar size="small" icon={<UserOutlined />} />{v}{r.role && <Tag>{r.role}</Tag>}{r.is_primary && <Tag color="gold">{t('cust_primary_contact')}</Tag>}</Space> },
            { title: t('cust_phone'), dataIndex: 'phone' },
            { title: t('cust_email'), dataIndex: 'email', render: (v: string) => v || '-' },
            { title: t('actions'), key: 'action', width: 180, render: (_: any, r: Contact) => <Space><Button type="link" size="small" onClick={() => onEditContact(r)}>{t('edit')}</Button>{!r.is_primary && <Button type="link" size="small" onClick={() => onSetPrimary(r.id)}>{t('cust_set_primary')}</Button>}<Popconfirm title={t('msg_confirm_delete')} onConfirm={() => onDeleteContact(r.id)}><Button type="link" size="small" danger>{t('delete')}</Button></Popconfirm></Space> },
          ]} />
        </div>
      )},
    ]} />
  </Drawer>
);

interface FollowUpModalProps { // 添加跟进弹窗
  open: boolean;
  form: any;
  submitting: boolean;
  onCancel: () => void;
  onFinish: (values: any) => void;
  t: (key: string) => string;
}

export const FollowUpModal: React.FC<FollowUpModalProps> = ({ open, form, submitting, onCancel, onFinish, t }) => (
  <Modal title={t('cust_followup_add')} open={open} onCancel={onCancel} footer={null}>
    <Form form={form} layout="vertical" onFinish={onFinish}>
      <Form.Item name="type" label={t('cust_followup_type')} rules={[{ required: true }]}><Select options={FOLLOW_TYPE_OPTIONS} /></Form.Item>
      <Form.Item name="content" label={t('cust_followup_content')} rules={[{ required: true }]}><TextArea rows={4} /></Form.Item>
      <Form.Item><Button type="primary" htmlType="submit" loading={submitting} block>{t('save')}</Button></Form.Item>
    </Form>
  </Modal>
);

interface ContactModalProps { // 添加/编辑联系人弹窗
  open: boolean;
  form: any;
  submitting: boolean;
  title: string;
  onCancel: () => void;
  onFinish: (values: any) => void;
  t: (key: string) => string;
}

export const ContactModal: React.FC<ContactModalProps> = ({ open, form, submitting, title, onCancel, onFinish, t }) => (
  <Modal title={title} open={open} onCancel={onCancel} footer={null}>
    <Form form={form} layout="vertical" onFinish={onFinish}>
      <Row gutter={16}>
        <Col span={12}><Form.Item name="name" label={t('cust_name')} rules={[{ required: true }]}><Input /></Form.Item></Col>
        <Col span={12}><Form.Item name="role" label={t('cust_role')}><Input /></Form.Item></Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}><Form.Item name="phone" label={t('cust_phone')} rules={[{ required: true }]}><Input /></Form.Item></Col>
        <Col span={12}><Form.Item name="email" label={t('cust_email')}><Input /></Form.Item></Col>
      </Row>
      <Form.Item><Button type="primary" htmlType="submit" loading={submitting} block>{t('save')}</Button></Form.Item>
    </Form>
  </Modal>
);

interface ImportModalProps { // 导入预览弹窗
  open: boolean;
  data: any[];
  importing: boolean;
  onCancel: () => void;
  onOk: () => void;
  t: (key: string) => string;
}

export const ImportModal: React.FC<ImportModalProps> = ({ open, data, importing, onCancel, onOk, t }) => (
  <Modal title={`${t('cust_import_preview')} (${data.length} ${t('cust_records')})`} open={open} onCancel={onCancel} width={900} okText={t('cust_import_confirm')} cancelText={t('cancel')} onOk={onOk} confirmLoading={importing}>
    <Table dataSource={data} size="small" scroll={{ y: 400, x: 1000 }} pagination={false} columns={[
      { title: t('cust_company'), dataIndex: 'company_name', width: 150 },
      { title: t('cust_contact'), dataIndex: 'contact_name', width: 80 },
      { title: t('cust_role'), dataIndex: 'contact_role', width: 80 },
      { title: t('cust_email'), dataIndex: 'email', width: 150 },
      { title: t('cust_phone'), dataIndex: 'phone', width: 120 },
      { title: t('cust_industry'), dataIndex: 'industry', width: 80 },
      { title: t('cust_source'), dataIndex: 'source', width: 80, render: (v: string) => SOURCE_MAP[v] || v },
      { title: t('cust_market_region'), dataIndex: 'market_region', width: 80 },
      { title: t('cust_country'), dataIndex: 'region', width: 80, render: (v: string) => getRegionLabel(v) || v },
    ]} />
  </Modal>
);
