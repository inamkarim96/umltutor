import React, { useEffect, useRef } from 'react';
import { X, AlertTriangle, Info, Trash2, Send } from 'lucide-react';

const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    isLoading = false
}) => {
    const confirmBtnRef = useRef(null);

    // Focus the confirm button on open for accessibility
    useEffect(() => {
        if (isOpen && confirmBtnRef.current) {
            setTimeout(() => confirmBtnRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const variantConfig = {
        danger: {
            icon: Trash2,
            iconBg: 'bg-red-50',
            iconColor: 'text-status-red',
            btnBg: 'bg-red-600 hover:bg-red-700',
            btnShadow: 'shadow-red-100',
            accent: '#DC2626'
        },
        warning: {
            icon: AlertTriangle,
            iconBg: 'bg-amber-50',
            iconColor: 'text-amber-500',
            btnBg: 'bg-amber-500 hover:bg-amber-600',
            btnShadow: 'shadow-amber-100',
            accent: '#D97706'
        },
        info: {
            icon: Info,
            iconBg: 'bg-accent/10',
            iconColor: 'text-accent',
            btnBg: 'bg-accent hover:bg-indigo-700',
            btnShadow: 'shadow-accent/20',
            accent: '#5046E5'
        },
        submit: {
            icon: Send,
            iconBg: 'bg-accent/10',
            iconColor: 'text-accent',
            btnBg: 'bg-accent hover:bg-indigo-700',
            btnShadow: 'shadow-accent/20',
            accent: '#5046E5'
        }
    };

    const cfg = variantConfig[variant] || variantConfig.info;
    const IconComp = cfg.icon;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
            style={{ background: 'rgba(13,13,20,0.55)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
        >
            <div className="bg-white rounded-lg shadow-hover w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-black/5">
                {/* Header */}
                <div className="px-8 pt-8 pb-6">
                    <div className="flex justify-between items-start mb-6">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${cfg.iconBg} ${cfg.iconColor}`}>
                            <IconComp size={22} />
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-muted hover:bg-surface-3 rounded-xl transition-all"
                            aria-label="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <h2
                        id="confirm-modal-title"
                        className="text-xl font-extrabold font-heading text-ink mb-2 leading-tight"
                    >
                        {title}
                    </h2>
                    <p className="text-muted font-medium leading-relaxed text-sm">{message}</p>
                </div>

                {/* Divider */}
                <div className="border-t border-black/5" />

                {/* Actions */}
                <div className="px-8 py-6 flex gap-3 bg-surface-3/30">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 py-3 bg-white text-muted rounded-lg font-extrabold font-heading hover:bg-gray-100 transition-all uppercase text-xs tracking-widest border border-black/8 disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        ref={confirmBtnRef}
                        type="button"
                        onClick={() => { onConfirm(); }}
                        disabled={isLoading}
                        className={`flex-1 py-3 text-white rounded-lg font-extrabold font-heading shadow-hover transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2 ${cfg.btnBg} ${cfg.btnShadow} disabled:opacity-60 disabled:cursor-not-allowed active:scale-95`}
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Processing...
                            </>
                        ) : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
