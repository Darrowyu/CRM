import React, { memo, useEffect } from 'react';
import { Modal, Form, Select, InputNumber, Button, Row, Col, Tag, Empty, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Customer } from '../../services/customerService';
import { Opportunity } from '../../services/opportunityService';
import { Quote } from '../../services/quoteService';
import { QuoteFormItem, calcFormTotal } from './types';

interface QuoteFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: { customer_id?: string; opportunity_id?: string; items: QuoteFormItem[] }) => Promise<boolean>;
  customers: Customer[];
  products: { id: string; name: string; sku: string; price: number }[];
  opportunities: Opportunity[];
  selectedCustomerId: string;
  onCustomerChange: (customerId: string) => void;
  submitting: boolean;
  t: (key: string) => string;
  mode: 'create' | 'edit';
  editQuote?: Quote | null;
}

const QuoteForm: React.FC<QuoteFormProps> = memo(({
  open,
  onClose,
  onSubmit,
  customers,
  products,
  opportunities,
  selectedCustomerId,
  onCustomerChange,
  submitting,
  t,
  mode,
  editQuote
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open && mode === 'edit' && editQuote) {
      form.setFieldsValue({
        items: editQuote.items?.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: Number(i.unit_price)
        }))
      });
    }
  }, [open, mode, editQuote, form]);

  const handleFinish = async (values: { customer_id?: string; opportunity_id?: string; items: QuoteFormItem[] }) => {
    const success = await onSubmit(values);
    if (success) {
      form.resetFields();
      onClose();
    }
  };

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  const title = mode === 'create'
    ? t('quote_create_title')
    : `${t('quote_edit_title')} - ${editQuote?.quote_number || ''}`;

  return (
    <Modal
      title={title}
      open={open}
      onCancel={handleClose}
      footer={null}
      width={700}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        {mode === 'create' && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="customer_id"
                label={t('quote_customer')}
                rules={[{ required: true, message: t('quote_select_customer_required') }]}
              >
                <Select
                  placeholder={t('quote_select_customer')}
                  showSearch
                  optionFilterProp="label"
                  options={customers.map(c => ({ value: c.id, label: c.company_name }))}
                  onChange={onCustomerChange}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="opportunity_id" label={t('quote_related_opp')}>
                <Select
                  placeholder={t('quote_select_opp')}
                  allowClear
                  disabled={!selectedCustomerId}
                  options={opportunities.map(o => ({
                    value: o.id,
                    label: `${o.name} (¥${Number(o.amount || 0).toLocaleString()})`
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        <Form.List name="items">
          {(fields, { add, remove }) => (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 500 }}>{t('quote_product_detail')}</span>
                <Space>
                  <Form.Item noStyle shouldUpdate>
                    {() => (
                      <Tag color="blue">
                        {t('quote_estimated_total')}: ¥{calcFormTotal(form.getFieldValue('items')).toLocaleString()}
                      </Tag>
                    )}
                  </Form.Item>
                  <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add()}>
                    {t('quote_add_product')}
                  </Button>
                </Space>
              </div>

              {fields.map(({ key, name }) => (
                <Row gutter={8} key={key} style={{ marginBottom: 8 }}>
                  <Col span={10}>
                    <Form.Item name={[name, 'product_id']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                      <Select
                        placeholder={t('quote_select_product')}
                        showSearch
                        optionFilterProp="label"
                        options={products.map(p => ({
                          value: p.id,
                          label: `${p.name} (${p.sku}) - ¥${p.price}`
                        }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={5}>
                    <Form.Item name={[name, 'quantity']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                      <InputNumber placeholder={t('quote_quantity')} min={1} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={5}>
                    <Form.Item name={[name, 'unit_price']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                      <InputNumber
                        placeholder={t('quote_unit_price')}
                        min={0}
                        step={0.01}
                        prefix="¥"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Button icon={<DeleteOutlined />} onClick={() => remove(name)} danger />
                  </Col>
                </Row>
              ))}

              {fields.length === 0 && (
                <Empty description={t('quote_no_products')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          )}
        </Form.List>

        <Form.Item style={{ marginTop: 24 }}>
          <Button type="primary" htmlType="submit" loading={submitting} block>
            {mode === 'create' ? t('quote_create_btn') : t('quote_save_changes')}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
});

QuoteForm.displayName = 'QuoteForm';

export default QuoteForm;
