import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Loader2,
  XCircle,
  FileEdit,
} from 'lucide-react';
import { AccountConnectionStatus, PlatformExecutionStatus, PostStatus } from '../../types';

export type StatusVariant =
  | AccountConnectionStatus
  | PostStatus
  | PlatformExecutionStatus
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

interface StatusPillProps {
  status: StatusVariant;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  label,
  size = 'md',
  className = '',
}) => {
  let icon = <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />;
  let text = label;
  let colorStyle = {
    color: 'var(--status-success)',
    backgroundColor: 'rgba(46, 158, 107, 0.12)',
    borderColor: 'rgba(46, 158, 107, 0.28)',
  };

  switch (status) {
    case 'active':
    case 'success':
    case 'published':
      icon = <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />;
      text = text || (status === 'active' ? 'Active' : 'Published');
      colorStyle = {
        color: 'var(--status-success)',
        backgroundColor: 'rgba(46, 158, 107, 0.12)',
        borderColor: 'rgba(46, 158, 107, 0.28)',
      };
      break;

    case 'expiring':
    case 'warning':
      icon = <AlertTriangle className="w-3.5 h-3.5 shrink-0" />;
      text = text || (status === 'expiring' ? 'Token expiring soon' : 'Warning');
      colorStyle = {
        color: 'var(--status-warning)',
        backgroundColor: 'rgba(217, 154, 30, 0.12)',
        borderColor: 'rgba(217, 154, 30, 0.28)',
      };
      break;

    case 'reauth_required':
      icon = <AlertOctagon className="w-3.5 h-3.5 shrink-0" />;
      text = text || 'Reauth required';
      colorStyle = {
        color: 'var(--status-danger)',
        backgroundColor: 'rgba(214, 69, 69, 0.12)',
        borderColor: 'rgba(214, 69, 69, 0.28)',
      };
      break;

    case 'unknown_reconciliation':
      icon = <AlertTriangle className="w-3.5 h-3.5 shrink-0" />;
      text = text || 'Reconciliation needed';
      colorStyle = {
        color: 'var(--status-warning)',
        backgroundColor: 'rgba(217, 154, 30, 0.12)',
        borderColor: 'rgba(217, 154, 30, 0.28)',
      };
      break;

    case 'disconnected':
    case 'danger':
    case 'failed':
      icon = <XCircle className="w-3.5 h-3.5 shrink-0" />;
      text = text || (status === 'failed' ? 'Failed' : 'Disconnected');
      colorStyle = {
        color: 'var(--status-danger)',
        backgroundColor: 'rgba(214, 69, 69, 0.12)',
        borderColor: 'rgba(214, 69, 69, 0.28)',
      };
      break;

    case 'needs_review':
      icon = <Clock className="w-3.5 h-3.5 shrink-0" />;
      text = text || 'Needs review';
      colorStyle = {
        color: 'var(--status-warning)',
        backgroundColor: 'rgba(217, 154, 30, 0.12)',
        borderColor: 'rgba(217, 154, 30, 0.28)',
      };
      break;

    case 'scheduled':
      icon = <Clock className="w-3.5 h-3.5 shrink-0" />;
      text = text || 'Scheduled';
      colorStyle = {
        color: 'var(--text)',
        backgroundColor: 'rgba(128, 128, 128, 0.12)',
        borderColor: 'var(--border)',
      };
      break;

    case 'publishing':
      icon = <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />;
      text = text || 'Publishing';
      colorStyle = {
        color: 'var(--text)',
        backgroundColor: 'rgba(128, 128, 128, 0.12)',
        borderColor: 'var(--border)',
      };
      break;

    case 'draft':
      icon = <FileEdit className="w-3.5 h-3.5 shrink-0" />;
      text = text || 'Draft';
      colorStyle = {
        color: 'var(--muted)',
        backgroundColor: 'rgba(128, 128, 128, 0.08)',
        borderColor: 'var(--border)',
      };
      break;

    case 'neutral':
    default:
      icon = <Clock className="w-3.5 h-3.5 shrink-0" />;
      text = text || 'Pending';
      colorStyle = {
        color: 'var(--muted)',
        backgroundColor: 'rgba(128, 128, 128, 0.08)',
        borderColor: 'var(--border)',
      };
      break;
  }

  const sizeClasses =
    size === 'sm'
      ? 'text-[11px] py-0.5 px-2.5 gap-1.5'
      : 'text-xs py-1 px-3 gap-1.5 font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-full border transition-all duration-200 select-none ${sizeClasses} ${className}`}
      style={colorStyle}
    >
      {icon}
      <span>{text}</span>
    </span>
  );
};
