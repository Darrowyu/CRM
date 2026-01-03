import { useCallback, useState } from 'react';
import { App } from 'antd';
import { quoteService, Quote, QuoteStatistics } from '../../../services/quoteService';
import { customerService, Customer } from '../../../services/customerService';
import { opportunityService, Opportunity } from '../../../services/opportunityService';
import { adminService } from '../../../services/adminService';
import { useLanguage } from '../../../contexts/LanguageContext';
import { QuoteFormItem } from '../types';

export const useQuoteActions = () => {
  const { message } = App.useApp();
  const { t } = useLanguage();

  // 状态
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [pendingQuotes, setPendingQuotes] = useState<Quote[]>([]);
  const [statistics, setStatistics] = useState<QuoteStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 表单数据
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; sku: string; price: number }[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // 加载主数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [all, pending, stats] = await Promise.all([
        quoteService.getAll(),
        quoteService.getPending(),
        quoteService.getStatistics()
      ]);
      setQuotes(all);
      setPendingQuotes(pending);
      setStatistics(stats);
    } catch {
      message.error(t('msg_load_error'));
    } finally {
      setLoading(false);
      setSelectedRowKeys([]);
    }
  }, [message, t]);

  // 加载表单数据
  const loadFormData = useCallback(async () => {
    try {
      const [custs, prods] = await Promise.all([
        customerService.getPrivatePool(),
        adminService.getProducts()
      ]);
      setCustomers(custs);
      setProducts(prods);
    } catch { /* ignore */ }
  }, []);

  // 客户变更处理
  const handleCustomerChange = useCallback(async (customerId: string) => {
    setSelectedCustomerId(customerId);
    if (customerId) {
      try {
        const opps = await opportunityService.getByCustomer(customerId);
        setOpportunities(opps.filter(o => o.stage !== 'closed_lost'));
      } catch {
        setOpportunities([]);
      }
    } else {
      setOpportunities([]);
    }
  }, []);

  // 删除
  const handleDelete = useCallback(async (id: string) => {
    try {
      await quoteService.delete(id);
      message.success(t('msg_delete_success'));
      loadData();
    } catch {
      message.error(t('msg_delete_error'));
    }
  }, [message, t, loadData]);

  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    if (!selectedRowKeys.length) return;
    try {
      const result = await quoteService.batchDelete(selectedRowKeys as string[]);
      message.success(t('msg_batch_delete_success').replace('{count}', String(result.deleted)));
      loadData();
    } catch {
      message.error(t('msg_delete_error'));
    }
  }, [selectedRowKeys, message, t, loadData]);

  // 批量提交
  const handleBatchSubmit = useCallback(async () => {
    if (!selectedRowKeys.length) return;
    try {
      const result = await quoteService.batchSubmit(selectedRowKeys as string[]);
      message.success(t('msg_batch_submit_success').replace('{count}', String(result.submitted)));
      loadData();
    } catch {
      message.error(t('msg_submit_error'));
    }
  }, [selectedRowKeys, message, t, loadData]);

  // 复制
  const handleCopy = useCallback(async (id: string) => {
    try {
      await quoteService.copy(id);
      message.success(t('msg_copy_success'));
      loadData();
    } catch {
      message.error(t('msg_copy_error'));
    }
  }, [message, t, loadData]);

  // 提交审批
  const handleSubmit = useCallback(async (id: string) => {
    try {
      await quoteService.submit(id);
      message.success(t('msg_submit_success'));
      loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || t('msg_submit_error'));
    }
  }, [message, t, loadData]);

  // 审批通过
  const handleApprove = useCallback(async (id: string) => {
    try {
      await quoteService.approve(id);
      message.success(t('msg_operation_success'));
      loadData();
    } catch {
      message.error(t('msg_operation_error'));
    }
  }, [message, t, loadData]);

  // 审批拒绝
  const handleReject = useCallback(async (id: string, reason: string) => {
    try {
      await quoteService.reject(id, reason);
      message.success(t('msg_operation_success'));
      loadData();
    } catch {
      message.error(t('msg_operation_error'));
    }
  }, [message, t, loadData]);

  // 转为订单
  const handleConvertToOrder = useCallback(async (quote: Quote) => {
    try {
      await quoteService.convertToOrder(quote.id);
      message.success(t('quote_convert_success'));
      loadData();
      return true;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || t('quote_convert_error'));
      return false;
    }
  }, [message, t, loadData]);

  // 创建报价单
  const handleCreate = useCallback(async (values: { customer_id?: string; opportunity_id?: string; items: QuoteFormItem[] }) => {
    if (!values.items?.length) {
      message.warning(t('quote_no_products'));
      return false;
    }
    setSubmitting(true);
    try {
      const validItems = values.items.filter(i => i.product_id && i.quantity && i.unit_price).map(i => ({
        product_id: i.product_id!,
        quantity: i.quantity!,
        unit_price: i.unit_price!
      }));
      await quoteService.create({
        customer_id: values.customer_id!,
        opportunity_id: values.opportunity_id,
        items: validItems
      });
      message.success(t('msg_save_success'));
      loadData();
      return true;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || t('msg_save_error'));
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [message, t, loadData]);

  // 更新报价单
  const handleUpdate = useCallback(async (id: string, items: QuoteFormItem[]) => {
    if (!items?.length) {
      message.warning(t('quote_no_products'));
      return false;
    }
    setSubmitting(true);
    try {
      const validItems = items.filter(i => i.product_id && i.quantity && i.unit_price).map(i => ({
        product_id: i.product_id!,
        quantity: i.quantity!,
        unit_price: i.unit_price!
      }));
      await quoteService.update(id, validItems);
      message.success(t('msg_update_success'));
      loadData();
      return true;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || t('msg_update_error'));
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [message, t, loadData]);

  // 获取详情
  const getDetail = useCallback(async (id: string) => {
    try {
      return await quoteService.getById(id);
    } catch {
      message.error(t('msg_load_error'));
      return null;
    }
  }, [message, t]);

  return {
    // 状态
    quotes,
    pendingQuotes,
    statistics,
    loading,
    submitting,
    selectedRowKeys,
    setSelectedRowKeys,
    // 表单数据
    customers,
    products,
    opportunities,
    selectedCustomerId,
    setSelectedCustomerId,
    // 方法
    loadData,
    loadFormData,
    handleCustomerChange,
    handleDelete,
    handleBatchDelete,
    handleBatchSubmit,
    handleCopy,
    handleSubmit,
    handleApprove,
    handleReject,
    handleConvertToOrder,
    handleCreate,
    handleUpdate,
    getDetail,
    // 工具
    message,
    t
  };
};
