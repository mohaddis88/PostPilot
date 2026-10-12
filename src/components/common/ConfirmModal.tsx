import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';
import { useApp } from '../../context/AppContext';

export const ConfirmModal: React.FC = () => {
  const { confirmModal, closeConfirmModal } = useApp();
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!confirmModal?.isOpen) return;

    // Focus confirm button when opened
    confirmBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeConfirmModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmModal?.isOpen, closeConfirmModal]);

  if (!confirmModal?.isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 transition-opacity"
      onClick={closeConfirmModal}
    >
      <div
        ref={modalRef}
        className="solid-overlay rounded-[20px] max-w-md w-full p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-full ${
                confirmModal.isDestructive
                  ? 'bg-[rgba(214,69,69,0.15)] text-[var(--status-danger)]'
                  : 'bg-[rgba(217,154,30,0.15)] text-[var(--status-warning)]'
              }`}
            >
              <AlertTriangle className="w-5 h-5 shrink-0" />
            </div>
            <h3 id="confirm-modal-title" className="text-base font-semibold text-[var(--text)]">
              {confirmModal.title}
            </h3>
          </div>
          <button
            onClick={closeConfirmModal}
            aria-label="Close dialog"
            className="p-1 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-[var(--muted)] leading-relaxed">
          {confirmModal.message}
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={closeConfirmModal}>
            Cancel
          </Button>
          <Button
            ref={confirmBtnRef}
            variant={confirmModal.isDestructive ? 'danger' : 'accent'}
            size="sm"
            onClick={() => {
              confirmModal.onConfirm();
              closeConfirmModal();
            }}
          >
            {confirmModal.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
