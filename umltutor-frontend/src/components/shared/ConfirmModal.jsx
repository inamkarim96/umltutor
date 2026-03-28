import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', variant = 'danger' }) => {
    if (!isOpen) return null;

    const variantStyles = {
        danger: 'bg-red-600 hover:bg-red-700 shadow-red-100',
        warning: 'bg-amber-500 hover:bg-amber-600 shadow-amber-100',
        info: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${variant === 'danger' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
                            <AlertTriangle size={24} />
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    
                    <h2 className="text-2xl font-black text-gray-900 mb-2">{title}</h2>
                    <p className="text-gray-500 font-medium leading-relaxed">{message}</p>
                    
                    <div className="mt-10 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-black hover:bg-gray-200 transition-all uppercase text-xs tracking-widest"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-1 py-3.5 text-white rounded-2xl font-black shadow-lg transition-all uppercase text-xs tracking-widest ${variantStyles[variant]}`}
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
