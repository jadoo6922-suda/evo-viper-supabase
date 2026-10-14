import React from 'react';
import { User } from '../../../types';
import { MerchantBadgeCard } from '../../MerchantBadgeCard';
import { XCircle } from 'lucide-react';

interface MerchantBadgeModalProps {
  merchant: User;
  isAr: boolean;
  onClose: () => void;
}

export const MerchantBadgeModal: React.FC<MerchantBadgeModalProps> = ({
  merchant,
  isAr,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl space-y-4">
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        <MerchantBadgeCard merchant={merchant} isAr={isAr} />
      </div>
    </div>
  );
};
