import React from 'react';
import { Clock, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';

const ICONS = {
    overdue: AlertCircle,
    graded: CheckCircle2,
    submitted: CheckCircle2,
    pending: Clock,
    active: Clock,
    locked: HelpCircle,
    none: HelpCircle,
};

const VARIANTS = {
    overdue: { bg: '#fef2f2', color: '#b91c1c', border: '#fca5a5', iconColor: '#ef4444' },
    graded: { bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe', iconColor: '#4f46e5' },
    submitted: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', iconColor: '#10b981' },
    pending: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', iconColor: '#3b82f6' },
    active: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', iconColor: '#3b82f6' },
    locked: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', iconColor: '#64748b' },
    none: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', iconColor: '#64748b' },
};

/**
 * Shared StatusChip component for consistent status display
 * @param {Object} props
 * @param {string} props.status - 'overdue' | 'graded' | 'submitted' | 'pending' | 'active' | 'locked' | 'none'
 * @param {string} props.customLabel - Override default label
 * @param {string} props.size - 'sm' | 'md' | 'lg'
 * @param {string} props.icon - Optional custom icon key
 * @param {boolean} props.showIcon - Show icon (default: true)
 */
export default function StatusChip({
    status = 'pending',
    customLabel = null,
    size = 'md',
    showIcon = true,
}) {
    const variant = VARIANTS[status] || VARIANTS.none;
    const Icon = ICONS[status] || ICONS.none;

    const sizeStyles = {
        sm: { fontSize: '10px', padding: '3px 8px', borderRadius: '6px', iconSize: 10, gap: '4px' },
        md: { fontSize: '11px', padding: '4px 10px', borderRadius: '8px', iconSize: 12, gap: '5px' },
        lg: { fontSize: '12px', padding: '5px 12px', borderRadius: '10px', iconSize: 14, gap: '6px' },
    };

    const label = customLabel || {
        overdue: 'Overdue',
        graded: 'Graded',
        submitted: 'Submitted',
        pending: 'Pending',
        active: 'Active',
        locked: 'Locked',
        none: 'No deadline',
    }[status] || 'Unknown';

    const style = sizeStyles[size];

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: style.gap,
                fontSize: style.fontSize,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: style.padding,
                borderRadius: style.borderRadius,
                background: variant.bg,
                color: variant.color,
                border: `1px solid ${variant.border}`,
                whiteSpace: 'nowrap',
            }}
        >
            {showIcon && <Icon size={style.iconSize} style={{ color: variant.iconColor }} />}
            {label}
        </span>
    );
}