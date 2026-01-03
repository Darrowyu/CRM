import React, { useState, useEffect, useCallback } from 'react';
import { Badge, Popover, List, Button, Empty, Spin, Typography, Space, Tag } from 'antd';
import { BellOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en';
import { notificationService } from '../../services/notificationService';
import { Notification } from '../../types/tasks';
import { useLanguage } from '../../contexts/LanguageContext';

dayjs.extend(relativeTime);

const NotificationCenter: React.FC = () => {
  const { t, language } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  // 根据语言设置dayjs locale
  useEffect(() => {
    dayjs.locale(language === 'zh' ? 'zh-cn' : 'en');
  }, [language]);

  const TYPE_MAP: Record<string, { label: string; color: string }> = {
    task_reminder: { label: t('notification_task_reminder'), color: 'blue' },
    approval_request: { label: t('notification_approval_request'), color: 'orange' },
    approval_result: { label: t('notification_approval_result'), color: 'green' },
    customer_claim: { label: t('notification_customer_claim'), color: 'cyan' },
    customer_release: { label: t('notification_customer_release'), color: 'purple' },
    target_alert: { label: t('notification_target_alert'), color: 'red' },
    system: { label: t('notification_system'), color: 'default' }
  };

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [list, count] = await Promise.all([notificationService.getAll(), notificationService.getUnreadCount()]);
      setNotifications(list);
      setUnreadCount(count);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadNotifications(); const timer = setInterval(loadNotifications, 60000); return () => clearInterval(timer); }, [loadNotifications]);

  const handleMarkRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleDelete = async (id: string) => {
    await notificationService.delete(id);
    const deleted = notifications.find(n => n.id === id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (deleted && !deleted.is_read) setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const content = (
    <div style={{ width: 360 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <Typography.Text strong>{t('notification_title')}</Typography.Text>
        {unreadCount > 0 && <Button type="link" size="small" onClick={handleMarkAllRead}>{t('notification_mark_all')}</Button>}
      </div>
      <Spin spinning={loading}>
        {notifications.length === 0 ? <Empty description={t('notification_empty')} style={{ padding: 24 }} /> : (
          <List dataSource={notifications.slice(0, 20)} renderItem={item => (
            <List.Item style={{ padding: '12px', background: item.is_read ? 'transparent' : '#f6ffed', cursor: 'pointer' }}
              onClick={() => !item.is_read && handleMarkRead(item.id)}
              actions={[<Button type="text" size="small" icon={<DeleteOutlined />} onClick={e => { e.stopPropagation(); handleDelete(item.id); }} />]}>
              <List.Item.Meta
                title={<Space><Tag color={TYPE_MAP[item.type]?.color} style={{ marginRight: 0 }}>{TYPE_MAP[item.type]?.label || item.type}</Tag><span>{item.title}</span></Space>}
                description={<><div style={{ fontSize: 12, color: '#888' }}>{item.content}</div><div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>{dayjs(item.created_at).fromNow()}</div></>}
              />
            </List.Item>
          )} />
        )}
      </Spin>
    </div>
  );

  return (
    <Popover content={content} trigger="click" placement="bottomRight" open={visible} onOpenChange={setVisible}>
      <Badge count={unreadCount} size="small" offset={[-2, 2]}>
        <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} />
      </Badge>
    </Popover>
  );
};

export default NotificationCenter;
