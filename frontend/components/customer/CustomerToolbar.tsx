import React, { memo } from 'react';
import { Input, Button, Space, Select, Segmented, Dropdown, Popconfirm, Typography } from 'antd';
import { SearchOutlined, PlusOutlined, ReloadOutlined, FileExcelOutlined, AppstoreOutlined, UnorderedListOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { INDUSTRY_OPTIONS, SOURCE_OPTIONS, MARKET_REGIONS } from './constants';

const { Text } = Typography;

interface CustomerToolbarProps {
  view: 'private' | 'public_pool';
  onViewChange: (view: 'private' | 'public_pool') => void;
  selectedCount: number;
  onBatchClaim: () => void;
  onBatchRelease: () => void;
  onBatchDelete: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterIndustry?: string;
  onFilterIndustryChange: (value?: string) => void;
  filterSource?: string;
  onFilterSourceChange: (value?: string) => void;
  filterMarket?: string;
  onFilterMarketChange: (value?: string) => void;
  sortField: string;
  onSortFieldChange: (value: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderToggle: () => void;
  loading: boolean;
  onRefresh: () => void;
  listMode: 'card' | 'table';
  onListModeChange: (mode: 'card' | 'table') => void;
  onExportTemplate: () => void;
  onImport: () => void;
  onExportData: () => void;
  onAdd: () => void;
  t: (key: string) => string;
}

const CustomerToolbar: React.FC<CustomerToolbarProps> = memo(({
  view, onViewChange, selectedCount, onBatchClaim, onBatchRelease, onBatchDelete,
  searchTerm, onSearchChange, filterIndustry, onFilterIndustryChange, filterSource, onFilterSourceChange,
  filterMarket, onFilterMarketChange, sortField, onSortFieldChange, sortOrder, onSortOrderToggle,
  loading, onRefresh, listMode, onListModeChange, onExportTemplate, onImport, onExportData, onAdd, t
}) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
    <Space>
      <div style={{ display: 'inline-flex', background: '#f0f0f0', borderRadius: 8, padding: 4 }}>
        <Button type={view === 'private' ? 'primary' : 'text'} onClick={() => onViewChange('private')} style={{ borderRadius: 6 }}>{t('cust_tab_private')}</Button>
        <Button type={view === 'public_pool' ? 'primary' : 'text'} onClick={() => onViewChange('public_pool')} style={{ borderRadius: 6, ...(view === 'public_pool' ? { background: '#fa8c16', borderColor: '#fa8c16' } : {}) }}>{t('cust_tab_public')}</Button>
      </div>
      {selectedCount > 0 && (
        <Space>
          <Text type="secondary">{t('cust_selected').replace('{count}', String(selectedCount))}</Text>
          {view === 'public_pool' ? <Button size="small" onClick={onBatchClaim}>{t('cust_batch_claim')}</Button> : <Popconfirm title={t('cust_confirm_batch_release')} onConfirm={onBatchRelease}><Button size="small" danger>{t('cust_batch_release')}</Button></Popconfirm>}
          <Popconfirm title={t('cust_confirm_batch_delete')} onConfirm={onBatchDelete}><Button size="small" danger>{t('cust_batch_delete')}</Button></Popconfirm>
        </Space>
      )}
    </Space>
    <Space>
      <Input prefix={<SearchOutlined />} placeholder={t('cust_search_placeholder')} value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} style={{ width: 180 }} allowClear />
      <Select placeholder={t('cust_filter_industry')} value={filterIndustry} onChange={onFilterIndustryChange} allowClear style={{ width: 100 }} options={INDUSTRY_OPTIONS} />
      <Select placeholder={t('cust_filter_source')} value={filterSource} onChange={onFilterSourceChange} allowClear style={{ width: 90 }} options={SOURCE_OPTIONS} />
      <Select placeholder={t('cust_filter_market')} value={filterMarket} onChange={onFilterMarketChange} allowClear style={{ width: 90 }} options={MARKET_REGIONS} />
      <Select value={sortField} onChange={onSortFieldChange} style={{ width: 100 }} options={[{ value: 'company_name', label: t('cust_sort_company') }, { value: 'industry', label: t('cust_sort_industry') }, { value: 'last_contact_date', label: t('cust_sort_contact') }]} />
      <Button icon={sortOrder === 'asc' ? <span>↑</span> : <span>↓</span>} onClick={onSortOrderToggle} />
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading} />
      <Segmented value={listMode} onChange={(v) => onListModeChange(v as 'card' | 'table')} options={[{ value: 'card', icon: <AppstoreOutlined /> }, { value: 'table', icon: <UnorderedListOutlined /> }]} />
      <Dropdown trigger={['click']} menu={{ items: [{ key: 'template', icon: <FileExcelOutlined />, label: t('cust_download_template'), onClick: onExportTemplate }, { key: 'import', icon: <UploadOutlined />, label: t('cust_import_customer'), onClick: onImport }, { key: 'export', icon: <DownloadOutlined />, label: t('cust_export_list'), onClick: onExportData }] }}><Button icon={<FileExcelOutlined />}>{t('cust_import_export')}</Button></Dropdown>
      <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>{t('cust_add_btn')}</Button>
    </Space>
  </div>
));

export default CustomerToolbar;
