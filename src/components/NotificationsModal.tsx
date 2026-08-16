import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Fingerprint,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import { NotificationItem } from '../types';
import { audioService } from '../services/audioService';

const initialNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'DEFCON 1 Escalation: WIN-FIN-07',
    message: 'Encoded PowerShell chain detected launching from PDF reader. Host containment recommended.',
    time: '2m ago',
    read: false,
    level: 'critical',
    query: 'Investigate incident INC-4281: Suspicious PowerShell execution on WIN-FIN-07',
  },
  {
    id: 'notif-2',
    title: 'Password Spray Anomaly: Maya Chen',
    message: '47 failed logins from Warsaw & Frankfurt proxy nodes. Step-up challenge staged.',
    time: '9m ago',
    read: false,
    level: 'warning',
    query: 'Investigate failed logins for m.chen@northstar.io',
  },
  {
    id: 'notif-3',
    title: 'Egress Block Active: ENG-LT-142',
    message: 'Data exfiltration destination fileshare-cloud.net blocked at edge firewall.',
    time: '27m ago',
    read: true,
    level: 'info',
    query: 'Summarize incident INC-4279',
  },
  {
    id: 'notif-4',
    title: 'Sensor Health Pulse Synchronized',
    message: '1,284 assets verified online. 0 telemetry drops in the last 60 minutes.',
    time: '45m ago',
    read: true,
    level: 'success',
  },
];

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunTriage: (query: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onRunTriage,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    audioService.playClick();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearAll = () => {
    audioService.playClick();
    setNotifications([]);
  };

  const handleItemClick = (notif: NotificationItem) => {
    audioService.playClick();
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    if (notif.query) {
      onClose();
      onRunTriage(notif.query);
    }
  };

  return (
    <>
      <button className="notifications-backdrop" onClick={onClose} aria-label="Close notifications" />
      <div className="notifications-dropdown" role="dialog" aria-modal="true" aria-label="SOC Alert Notifications">
        <div className="notif-header">
          <div className="notif-header-title">
            <Bell size={16} />
            <strong>Notifications</strong>
            {unreadCount > 0 && <span className="unread-counter">{unreadCount} new</span>}
          </div>
          <div className="notif-actions">
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} title="Mark all read">
                <Check size={14} /> Mark all read
              </button>
            )}
            <button onClick={handleClearAll} title="Clear notifications">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="notif-list">
          {notifications.length === 0 ? (
            <div className="notif-empty">
              <ShieldCheck size={28} />
              <strong>All caught up!</strong>
              <p>No active unread alerts or notifications.</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const Icon =
                notif.level === 'critical'
                  ? ShieldAlert
                  : notif.level === 'warning'
                  ? AlertTriangle
                  : notif.level === 'success'
                  ? CheckCircle2
                  : Radio;

              return (
                <div
                  key={notif.id}
                  className={`notif-item ${notif.level} ${notif.read ? 'read' : 'unread'}`}
                  onClick={() => handleItemClick(notif)}
                >
                  <div className={`notif-icon ${notif.level}`}><Icon size={16} /></div>
                  <div className="notif-text">
                    <div className="notif-title-row">
                      <strong>{notif.title}</strong>
                      <span className="notif-time">{notif.time}</span>
                    </div>
                    <p>{notif.message}</p>
                    {notif.query && (
                      <span className="notif-triage-link">
                        Triage with Aegis <ArrowRight size={11} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};
