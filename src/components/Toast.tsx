import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    success: <CheckCircle className="text-emerald-600" size={20} />,
    error: <XCircle className="text-red-600" size={20} />,
    warning: <AlertCircle className="text-amber-600" size={20} />,
    info: <AlertCircle className="text-sky-600" size={20} />,
  };

  const colors = {
    success: 'border-emerald-300 bg-white shadow-xl',
    error: 'border-red-300 bg-white shadow-xl',
    warning: 'border-amber-300 bg-white shadow-xl',
    info: 'border-sky-300 bg-white shadow-xl',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      className={`mb-2 min-w-[300px] max-w-[400px] p-4 rounded-lg border ${colors[type]} pointer-events-auto`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm">{title}</p>
          {message && (
            <p className="text-slate-600 text-xs mt-1 leading-relaxed">{message}</p>
          )}
        </div>
        <button
          onClick={() => onClose(id)}
          className="flex-shrink-0 text-slate-400 hover:text-slate-700 transition-colors p-1"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
};

export default Toast;
