import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Transaction } from '../types';
import { useStore } from '../context/StoreContext';
import { WalletBalanceCard } from './wallet/WalletBalanceCard';
import { WalletTransactionsList } from './wallet/WalletTransactionsList';
import { TransferModal } from './wallet/TransferModal';
import { ReceiveModal } from './wallet/ReceiveModal';
import { TopUpModal } from './wallet/TopUpModal';
import { ProofVerificationModal } from './wallet/ProofVerificationModal';

interface WalletViewProps {
  onOpenReceipt: (tx: Transaction) => void;
  onNavigateToDisputes: () => void;
}

export const WalletView: React.FC<WalletViewProps> = ({
  onOpenReceipt,
  onNavigateToDisputes,
}) => {
  const {
    currentUser,
    getUserBalance,
    transactions,
    sendTransfer,
    generateTransferCode,
    activeTransferCode,
    verifyProofImage,
    language,
  } = useStore();

  const isAr = language === 'ar';
  const balance = currentUser ? getUserBalance(currentUser.id) : 0;

  // Active sub-modals / actions
  const [modalType, setModalType] = useState<
    'none' | 'transfer' | 'receive' | 'top_up' | 'proof_verification'
  >('none');

  // Countdown timer for 10-minute temporary transfer code
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(600);
  const [activeCodeString, setActiveCodeString] = useState<string>('');

  // Receive QR state
  const [receiveQrUrl, setReceiveQrUrl] = useState<string>('');

  // Request the initial transfer code once, then display only the server-confirmed value.
  useEffect(() => {
    if (!activeTransferCode) void generateTransferCode();
  }, []);

  useEffect(() => {
    setActiveCodeString(activeTransferCode?.code || '');
    if (activeTransferCode) setTimeLeftSeconds(Math.max(0, Math.floor((activeTransferCode.expiresAt - Date.now()) / 1000)));
  }, [activeTransferCode]);

  // 10-minute countdown loop
  useEffect(() => {
    if (!activeTransferCode) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((activeTransferCode.expiresAt - Date.now()) / 1000));
      setTimeLeftSeconds(remaining);
      if (remaining === 0) {
        // Expired
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTransferCode]);

  // Generate QR for receive
  useEffect(() => {
    if (!currentUser) return;
    const payload = JSON.stringify({
      recipientId: currentUser.id,
      name: currentUser.displayName,
      receiveCode: activeCodeString || currentUser.transferCode || currentUser.id,
    });
    QRCode.toDataURL(
      payload,
      {
        width: 180,
        margin: 1,
        color: { dark: '#0b0d10', light: '#ffffff' },
      },
      (err, url) => {
        if (!err && url) setReceiveQrUrl(url);
      }
    );
  }, [currentUser, activeCodeString]);

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleGenerateFreshCode = () => {
    generateTransferCode();
    setActiveCodeString('');
    setTimeLeftSeconds(600);
  };

  return (
    <div className="w-full space-y-8 pb-16">
      {/* 1. Main Luxury Balance Card */}
      <WalletBalanceCard
        balance={balance}
        isAr={isAr}
        activeCodeString={activeCodeString}
        timeLeftSeconds={timeLeftSeconds}
        formatCountdown={formatCountdown}
        onOpenTransfer={() => setModalType('transfer')}
        onOpenReceive={() => setModalType('receive')}
        onOpenTopUp={() => setModalType('top_up')}
        onOpenProofVerification={() => setModalType('proof_verification')}
        onNavigateToDisputes={onNavigateToDisputes}
        onGenerateFreshCode={handleGenerateFreshCode}
      />

      {/* 2. Transaction History Section */}
      <WalletTransactionsList
        transactions={transactions}
        currentUser={currentUser}
        isAr={isAr}
        onOpenReceipt={onOpenReceipt}
      />

      {/* MODAL 1: Send Transfer */}
      {modalType === 'transfer' && (
        <TransferModal
          isAr={isAr}
          balance={balance}
          currentUser={currentUser}
          onClose={() => setModalType('none')}
          onSuccess={(receipt) => onOpenReceipt(receipt)}
          sendTransfer={sendTransfer}
        />
      )}

      {/* MODAL 2: Receive Section (QR Code & Receive Code) */}
      {modalType === 'receive' && (
        <ReceiveModal
          isAr={isAr}
          receiveQrUrl={receiveQrUrl}
          activeCodeString={activeCodeString}
          currentUser={currentUser}
          timeLeftSeconds={timeLeftSeconds}
          formatCountdown={formatCountdown}
          onClose={() => setModalType('none')}
        />
      )}

      {/* MODAL 3: Top Up Wallet via Admin WhatsApp */}
      {modalType === 'top_up' && (
        <TopUpModal
          isAr={isAr}
          currentUser={currentUser}
          onClose={() => setModalType('none')}
        />
      )}

      {/* MODAL 4: Proof Image Verification (OCR Simulation) */}
      {modalType === 'proof_verification' && (
        <ProofVerificationModal
          isAr={isAr}
          onClose={() => setModalType('none')}
          verifyProofImage={verifyProofImage}
        />
      )}
    </div>
  );
};
