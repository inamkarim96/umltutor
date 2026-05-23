import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', variant = 'danger' }) => {
    if (!isOpen) return null;

    const variantStyles = {
        danger: 'bg-red-600 hover:bg-red-700 shadow-red-100',
        warning: 'bg-amber-500 hover:bg-amber-600 shadow-amber-100',
        info: 'bg-accent hover:bg-indigo-700 shadow-accent/20'
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-hover w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${variant === 'danger' ? 'bg-status-red/10 text-status-red' : 'bg-amber-50 text-amber-500'}`}>
                            <AlertTriangle size={24} />
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-muted hover:bg-surface-3 rounded-xl transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    
                    <h2 className="text-2xl font-extrabold font-heading text-ink mb-2">{title}</h2>
                    <p className="text-muted font-medium leading-relaxed">{message}</p>
                    
                    <div className="mt-10 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3.5 bg-surface-3 text-muted rounded-lg font-extrabold font-heading hover:bg-gray-200 transition-all uppercase text-xs tracking-widest"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-1 py-3.5 text-white rounded-lg font-extrabold font-heading shadow-hover transition-all uppercase text-xs tracking-widest ${variantStyles[variant]}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
