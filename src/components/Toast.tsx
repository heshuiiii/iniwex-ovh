import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, type, title, message, duration = 3000, onClose }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const icons = {
    success: <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={20} />,
    error: <XCircle className="text-red-600 dark:text-red-400" size={20} />,
    warning: <AlertCircle className="text-amber-600 dark:text-amber-400" size={20} />,
    info: <AlertCircle className="text-sky-600 dark:text-sky-400" size={20} />,
  };

  const colors = {
    success: 'border-2 border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/90 dark:border-emerald-500 dark:text-white',
    error: 'border-2 border-red-600 bg-red-50 text-red-950 dark:bg-red-950/90 dark:border-red-500 dark:text-white',
    warning: 'border-2 border-amber-600 bg-amber-50 text-amber-950 dark:bg-amber-950/90 dark:border-amber-500 dark:text-white',
    info: 'border-2 border-sky-600 bg-sky-50 text-sky-950 dark:bg-sky-950/90 dark:border-sky-500 dark:text-white',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      className={`mb-2 min-w-[300px] max-w-[400px] p-4 rounded-xl shadow-2xl ${colors[type]} pointer-events-auto`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-sm leading-snug">{title}</p>
          {message && (
            <p className="text-xs font-semibold mt-1 leading-relaxed opacity-90">{message}</p>
          )}
        </div>
        <button
          onClick={() => onClose(id)}
          className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity p-1"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
};

export default Toast;
