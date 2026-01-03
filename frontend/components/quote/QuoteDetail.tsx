import React, { memo } from 'react';
import { Drawer, Spin, Descriptions, Tag, Card, Table, Space, Button, Popconfirm } from 'antd';
import { PrinterOutlined, CopyOutlined, EditOutlined, SendOutlined, CheckCircleOutlined, CloseCircleOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Quote } from '../../services/quoteService';
import ApprovalSteps from './ApprovalSteps';

interface QuoteDetailProps {
  open: boolean;
  quote: Quote | null;
  loading: boolean;
  onClose: () => void;
  onEdit: (quote: Quote) => void;
  onCopy: (id: string) => void;
  onSubmit: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onConvert: (quote: Quote) => void;
  onPrint: (quote: Quote) => void;
  statusMap: Record<string, { color: string; label: string; step: number }>;
  t: (key: string) => string;
}

const QuoteDetail: React.FC<QuoteDetailProps> = memo(({
  open,
  quote,
  loading,
  onClose,
  onEdit,
  onCopy,
  onSubmit,
  onApprove,
  onReject,
  onConvert,
  onPrint,
  statusMap,
  t
}) => {
  if (!quote) return null;

  const itemColumns = [
    { title: t('quote_product_name'), dataIndex: 'product_name', key: 'product_name' },
    { title: t('quote_product_sku'), dataIndex: 'product_sku', key: 'product_sku' },
    { title: t('quote_quantity'), dataIndex: 'quantity', key: 'quantity' },
    { title: t('quote_unit_price'), dataIndex: 'unit_price', key: 'unit_price', render: (v: number) => `¥${Number(v).toFixed(2)}` },
    { title: t('quote_subtotal'), dataIndex: 'total', key: 'total', render: (v: number) => <span style={{ color: '#52c41a' }}>¥{Number(v).toLocaleString()}</span> },
  ];

  const logColumns = [
    { title: t('quote_action'), dataIndex: 'action', render: (v: string) => <Tag color={v === 'approve' ? 'success' : 'error'}>{v === 'approve' ? t('quote_action_approve') : t('quote_action_reject')}</Tag> },
    { title: t('quote_approver'), dataIndex: 'approver_name' },
    { title: t('quote_comment'), dataIndex: 'comment', render: (v: string) => v || '-' },
    { title: t('log_time'), dataIndex: 'created_at', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
  ];

  return (
    <Drawer
      title={`${t('quote_detail_title')} - ${quote.quote_number || ''}`}
      open={open}
      onClose={onClose}
      size="large"
    >
      <Spin spinning={loading}>
        <div style={{ marginBottom: 24 }}>
          <ApprovalSteps quote={quote} statusMap={statusMap} t={t} />
        </div>

        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label={t('quote_number')}>{quote.quote_number}</Descriptions.Item>
          <Descriptions.Item label={t('quote_status')}>
            <Tag color={statusMap[quote.status]?.color}>{statusMap[quote.status]?.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t('quote_customer')}>{quote.customer_name || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('quote_total')}>
            <span style={{ color: '#52c41a', fontWeight: 600, fontSize: 16 }}>
              ¥{Number(quote.total_amount || 0).toLocaleString()}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label={t('quote_creator')}>{quote.created_by_name || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('quote_create_time')}>
            {dayjs(quote.created_at).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          {quote.rejection_reason && (
            <Descriptions.Item label={t('quote_rejection_reason')} span={2}>
              <span style={{ color: '#ff4d4f' }}>{quote.rejection_reason}</span>
            </Descriptions.Item>
          )}
        </Descriptions>

        <Card size="small" title={t('quote_product_detail')} style={{ marginTop: 16 }}>
          <Table
            size="small"
            pagination={false}
            dataSource={quote.items || []}
            rowKey="id"
            columns={itemColumns}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4} align="right">
                  <strong>{t('quote_total_label')}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <strong style={{ color: '#52c41a' }}>
                    ¥{Number(quote.total_amount || 0).toLocaleString()}
                  </strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </Card>

        {quote.approval_logs && quote.approval_logs.length > 0 && (
          <Card size="small" title={t('quote_approval_log')} style={{ marginTop: 16 }}>
            <Table
              size="small"
              pagination={false}
              dataSource={quote.approval_logs}
              rowKey="id"
              columns={logColumns}
            />
          </Card>
        )}

        <div style={{ marginTop: 24 }}>
          <Space>
            <Button icon={<PrinterOutlined />} onClick={() => onPrint(quote)}>
              {t('quote_print_export')}
            </Button>
            <Button icon={<CopyOutlined />} onClick={() => { onCopy(quote.id); onClose(); }}>
              {t('quote_copy_quote')}
            </Button>
            {(quote.status === 'draft' || quote.status === 'rejected') && (
              <>
                <Button icon={<EditOutlined />} onClick={() => { onClose(); onEdit(quote); }}>
                  {t('edit')}
                </Button>
                {quote.status === 'draft' && (
                  <Popconfirm title={t('quote_submit_confirm')} onConfirm={() => onSubmit(quote.id)}>
                    <Button type="primary" icon={<SendOutlined />}>
                      {t('quote_submit_approval')}
                    </Button>
                  </Popconfirm>
                )}
              </>
            )}
            {quote.status === 'pending_manager' && (
              <>
                <Popconfirm title={t('quote_approve_confirm')} onConfirm={() => onApprove(quote.id)}>
                  <Button type="primary" icon={<CheckCircleOutlined />}>
                    {t('quote_approve')}
                  </Button>
                </Popconfirm>
                <Button danger icon={<CloseCircleOutlined />} onClick={() => onReject(quote.id)}>
                  {t('quote_reject')}
                </Button>
              </>
            )}
            {quote.status === 'approved' && (
              <Button type="primary" icon={<ShoppingCartOutlined />} onClick={() => onConvert(quote)}>
                {t('quote_convert_order')}
              </Button>
            )}
          </Space>
        </div>
      </Spin>
    </Drawer>
  );
});

QuoteDetail.displayName = 'QuoteDetail';

export default QuoteDetail;
