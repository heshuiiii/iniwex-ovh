import React, { useState, useCallback, createContext, useContext } from 'react';
import { AnimatePresence } from 'framer-motion';
import Toast, { ToastProps } from './Toast';

interface ToastContextType {
  showToast: (toast: Omit<ToastProps, 'id' | 'onClose'>) => void;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<(ToastProps & { id: string })[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { ...toast, id, onClose: removeToast }]);
  }, [removeToast]);

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmDialog({ options, resolve });
    });
  }, []);

  const handleConfirm = (result: boolean) => {
    if (confirmDialog) {
      confirmDialog.resolve(result);
      setConfirmDialog(null);
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, showConfirm }}>
      {children}
      
      {/* Toast 容器 - 右下角，预留滚动条空间 */}
      <div className="fixed bottom-4 right-6 z-[9999] flex flex-col items-end pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <Toast key={toast.id} {...toast} />
          ))}
        </AnimatePresence>
      </div>

      {/* 确认对话框 - 居中 */}
      <AnimatePresence>
        {confirmDialog && (
          <>
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]"
              onClick={() => handleConfirm(false)}
            />
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full pointer-events-auto shadow-2xl">
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  {confirmDialog.options.title}
                </h3>
                {confirmDialog.options.message && (
                  <p className="text-slate-600 text-sm mb-6 whitespace-pre-line leading-relaxed">
                    {confirmDialog.options.message}
                  </p>
                )}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => handleConfirm(false)}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    {confirmDialog.options.cancelText || '取消'}
                  </button>
                  <button
                    onClick={() => handleConfirm(true)}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-sky-600 bg-sky-600 text-white hover:bg-sky-700 transition-colors shadow-sm"
                  >
                    {confirmDialog.options.confirmText || '确定'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};
