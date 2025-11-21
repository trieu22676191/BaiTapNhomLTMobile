import { useState, useCallback } from 'react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  onConfirm: (() => void) | null;
}

export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    message: '',
    onConfirm: null,
  });

  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfirmState({
          isOpen: true,
          title: options.title || 'Xác nhận',
          message: options.message,
          confirmText: options.confirmText || 'Xác nhận',
          cancelText: options.cancelText || 'Hủy',
          type: options.type || 'warning',
          onConfirm: () => {
            setConfirmState((prev) => ({ ...prev, isOpen: false, onConfirm: null }));
            resolve(true);
          },
        });
      });
    },
    []
  );

  const handleCancel = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, isOpen: false, onConfirm: null }));
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmState.onConfirm) {
      confirmState.onConfirm();
    }
  }, [confirmState.onConfirm]);

  return {
    confirm,
    confirmState,
    handleCancel,
    handleConfirm,
  };
};

