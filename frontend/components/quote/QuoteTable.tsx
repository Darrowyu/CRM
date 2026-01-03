import React, { memo, useMemo } from 'react';
import { Table, Tag, Button, Space, Popconfirm, Tooltip } from 'antd';
import { EyeOutlined, CopyOutlined, EditOutlined, SendOutlined, DeleteOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Quote } from '../../services/quoteService';

interface QuoteTableProps {
  quotes: Quote[];
  loading: boolean;
  selectedRowKeys: React.Key[];
  onSelectChange: (keys: React.Key[]) => void;
  onView: (quote: Quote) => void;
  onEdit: (quote: Quote) => void;
  onDelete: (id: string) => void;
  onCopy: (id: string) => void;
  onSubmit: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onConvert: (quote: Quote) => void;
  statusMap: Record<string, { color: string; label: string; step: number }>;
  t: (key: string) => string;
}

const QuoteTable: React.FC<QuoteTableProps> = memo(({
  quotes,
  loading,
  selectedRowKeys,
  onSelectChange,
  onView,
  onEdit,
  onDelete,
  onCopy,
  onSubmit,
  onApprove,
  onReject,
  onConvert,
  statusMap,
  t
}) => {
  const columns = useMemo(() => [
    {
      title: t('quote_number'),
      dataIndex: 'quote_number',
      key: 'quote_number',
      render: (v: string) => <a>{v}</a>
    },
    {
      title: t('quote_customer'),
      dataIndex: 'customer_name',
      key: 'customer_name',
      ellipsis: true
    },
    {
      title: t('field_amount'),
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (v: number) => <span style={{ color: '#52c41a', fontWeight: 500 }}>¥{Number(v || 0).toLocaleString()}</span>,
      sorter: (a: Quote, b: Quote) => (a.total_amount || 0) - (b.total_amount || 0)
    },
    {
      title: t('quote_status'),
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={statusMap[v]?.color}>{statusMap[v]?.label || v}</Tag>,
      filters: Object.entries(statusMap).map(([k, v]) => ({ text: v.label, value: k })),
      onFilter: (v: boolean | React.Key, r: Quote) => r.status === v
    },
    {
      title: t('quote_creator'),
      dataIndex: 'created_by_name',
      key: 'created_by_name'
    },
    {
      title: t('quote_create_time'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD'),
      sorter: (a: Quote, b: Quote) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix()
    },
    {
      title: t('actions'),
      key: 'action',
      width: 280,
      render: (_: unknown, record: Quote) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => onView(record)}>
            {t('quote_view')}
          </Button>
          <Tooltip title={t('quote_copy')}>
            <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => onCopy(record.id)} />
          </Tooltip>
          {record.status === 'pending_manager' && (
            <>
              <Popconfirm title={t('quote_approve_confirm')} onConfirm={() => onApprove(record.id)}>
                <Button type="link" size="small" style={{ color: '#52c41a' }}>{t('quote_approve')}</Button>
              </Popconfirm>
              <Button type="link" size="small" danger onClick={() => onReject(record.id)}>
                {t('quote_reject')}
              </Button>
            </>
          )}
          {record.status === 'approved' && (
            <Button type="link" size="small" icon={<ShoppingCartOutlined />} onClick={() => onConvert(record)}>
              {t('quote_convert')}
            </Button>
          )}
          {record.status === 'draft' && (
            <>
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onEdit(record)}>
                {t('edit')}
              </Button>
              <Popconfirm title={t('quote_submit_confirm')} onConfirm={() => onSubmit(record.id)}>
                <Button type="link" size="small" icon={<SendOutlined />}>{t('submit')}</Button>
              </Popconfirm>
              <Popconfirm title={t('quote_delete_confirm')} onConfirm={() => onDelete(record.id)}>
                <Button type="link" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          )}
          {record.status === 'rejected' && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onEdit(record)}>
              {t('quote_re_edit')}
            </Button>
          )}
        </Space>
      )
    }
  ], [t, statusMap, onView, onCopy, onApprove, onReject, onConvert, onEdit, onSubmit, onDelete]);

  const rowSelection = useMemo(() => ({
    selectedRowKeys,
    onChange: onSelectChange,
    getCheckboxProps: (r: Quote) => ({ disabled: r.status !== 'draft' })
  }), [selectedRowKeys, onSelectChange]);

  return (
    <Table
      columns={columns}
      dataSource={quotes}
      rowKey="id"
      loading={loading}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: total => t('quote_pagination_total').replace('{total}', String(total))
      }}
      size="small"
      rowSelection={rowSelection}
    />
  );
});

QuoteTable.displayName = 'QuoteTable';

export default QuoteTable;
