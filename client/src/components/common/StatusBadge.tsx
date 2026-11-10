import React from 'react';
import { TransactionStatus } from '../../types';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  CreditCard, 
  CheckCheck, 
  Hammer, 
  Truck, 
  AlertTriangle, 
  XCircle 
} from 'lucide-react';

interface Props {
  status: TransactionStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const normStatus = (status || 'DRAFT').toUpperCase();

  const getStyle = () => {
    switch (normStatus) {
      case 'DRAFT':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          label: 'Draft',
          icon: FileText,
        };
      case 'AGREEMENT_PENDING':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          label: 'Agreement Pending',
          icon: Clock,
        };
      case 'APPROVED':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          label: 'Approved by Customer',
          icon: CheckCircle2,
        };
      case 'PAYMENT_PENDING':
        return {
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          label: 'Payment Pending',
          icon: CreditCard,
        };
      case 'PAID':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          label: 'PayPal Paid',
          icon: CheckCheck,
        };
      case 'IN_PROGRESS':
        return {
          bg: 'bg-sky-50 text-sky-700 border-sky-200',
          label: 'In Progress',
          icon: Hammer,
        };
      case 'DELIVERED':
        return {
          bg: 'bg-teal-50 text-teal-800 border-teal-200',
          label: 'Delivered',
          icon: Truck,
        };
      case 'COMPLETED':
        return {
          bg: 'bg-green-50 text-green-800 border-green-200',
          label: 'Completed',
          icon: CheckCircle2,
        };
      case 'DISPUTED':
        return {
          bg: 'bg-red-50 text-red-800 border-red-200 font-semibold',
          label: 'Disputed',
          icon: AlertTriangle,
        };
      case 'CANCELLED':
        return {
          bg: 'bg-gray-100 text-gray-500 border-gray-200',
          label: 'Cancelled',
          icon: XCircle,
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          label: normStatus,
          icon: FileText,
        };
    }
  };

  const { bg, label, icon: Icon } = getStyle();
  const px = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${bg} ${px}`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{label}</span>
    </span>
  );
};

