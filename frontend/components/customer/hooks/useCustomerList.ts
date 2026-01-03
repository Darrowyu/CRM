import { useState, useCallback, useRef } from 'react';
import { App } from 'antd';
import { customerService, Customer } from '../../../services/customerService';
import { useLanguage } from '../../../contexts/LanguageContext';

export type ViewType = 'private' | 'public_pool';

export const useCustomerList = () => {
  const [view, setView] = useState<ViewType>('private');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  const { message } = App.useApp();

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = view === 'private' ? await customerService.getPrivatePool() : await customerService.getPublicPool();
      setCustomers(data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || t('cust_load_failed'));
    } finally { setLoading(false); }
  }, [view, message, t]);

  const handleClaim = useCallback(async (id: string) => {
    try { await customerService.claim(id); message.success(t('success')); loadCustomers(); }
    catch (err: unknown) { const error = err as { response?: { data?: { message?: string } } }; message.error(error.response?.data?.message || t('cust_claim_failed')); }
  }, [loadCustomers, message, t]);

  const handleRelease = useCallback(async (id: string) => {
    try { await customerService.release(id); message.success(t('success')); loadCustomers(); }
    catch (err: unknown) { const error = err as { response?: { data?: { message?: string } } }; message.error(error.response?.data?.message || t('cust_release_failed')); }
  }, [loadCustomers, message, t]);

  const handleBatchClaim = useCallback(async () => {
    if (!selectedIds.length) { message.warning(t('cust_select_customer')); return; }
    try {
      const result = await customerService.batchClaim(selectedIds);
      message.success(t('cust_batch_claim_result').replace('{success}', String(result.success)).replace('{failed}', String(result.failed)));
      setSelectedIds([]); loadCustomers();
    } catch { message.error(t('cust_batch_claim_failed')); }
  }, [selectedIds, loadCustomers, message, t]);

  const handleBatchRelease = useCallback(async () => {
    if (!selectedIds.length) { message.warning(t('cust_select_customer')); return; }
    try {
      const result = await customerService.batchRelease(selectedIds);
      message.success(t('cust_batch_release_result').replace('{success}', String(result.success)).replace('{failed}', String(result.failed)));
      setSelectedIds([]); loadCustomers();
    } catch { message.error(t('cust_batch_release_failed')); }
  }, [selectedIds, loadCustomers, message, t]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const changeView = useCallback((newView: ViewType) => { setView(newView); setSelectedIds([]); }, []);

  return {
    view, customers, loading, selectedIds, submitting, importing, fileInputRef, t, message,
    loadCustomers, handleClaim, handleRelease, handleBatchClaim, handleBatchRelease,
    toggleSelect, changeView, setSelectedIds, setSubmitting, setImporting
  };
};
