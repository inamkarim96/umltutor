import React from 'react';
import { Plus, BookOpen, CheckCircle2, FileText, Clock, Users, Star, RefreshCw, Search, Mail } from 'lucide-react';

const ICON_MAP = {
    plus: Plus,
    book: BookOpen,
    check: CheckCircle2,
    file: FileText,
    clock: Clock,
    users: Users,
    star: Star,
    refresh: RefreshCw,
    search: Search,
    mail: Mail,
};

/**
 * Shared EmptyState component for consistent empty states across dashboards
 * @param {Object} props
 * @param {string} props.icon - Icon key: 'plus' | 'book' | 'check' | 'file' | 'clock' | 'users' | 'star' | 'refresh' | 'search' | 'mail'
 * @param {string} props.title - Title text
 * @param {string} props.description - Description text
 * @param {Object} props.action - { label, onClick, icon }
 * @param {string} props.variant - 'default' | 'success' | 'info' | 'warning'
 * @param {string} props.size - 'sm' | 'md' | 'lg'
 */
export default function EmptyState({
    icon = 'book',
    title = 'No items yet',
    description = 'Get started by adding your first item.',
    action = null,
    variant: variantProp = 'default',
    size = 'md'
}) {
    const Icon = ICON_MAP[icon] || BookOpen;

    const sizeStyles = {
        sm: { iconSize: 28, padding: '24px 16px', titleSize: '16px', descSize: '13px' },
        md: { iconSize: 36, padding: '32px 24px', titleSize: '18px', descSize: '14px' },
        lg: { iconSize: 48, padding: '48px 32px', titleSize: '22px', descSize: '15px' },
    };

    const variantStyles = {
        default: { iconColor: 'var(--ink-3)', bgColor: 'transparent' },
        success: { iconColor: 'var(--green)', bgColor: 'var(--green-soft)' },
        info: { iconColor: 'var(--blue)', bgColor: 'var(--blue-soft)' },
        warning: { iconColor: 'var(--amber)', bgColor: 'var(--amber-soft)' },
    };

    const style = sizeStyles[size];
    const variant = variantStyles[variantProp];

    return (
        <div
            className="sdb-empty"
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: style.padding,
                textAlign: 'center',
                gap: '12px',
                background: variant.bgColor,
                borderRadius: 'var(--r-lg)',
                border: variant.bgColor ? 'none' : '2px dashed var(--border)',
            }}
        >
            <Icon
                size={style.iconSize}
                className="sdb-empty-icon"
                style={{ color: variant.iconColor }}
            />
            <h3
                style={{
                    fontSize: style.titleSize,
                    fontWeight: 800,
                    fontFamily: 'var(--font-d)',
                    color: 'var(--ink)',
                    margin: 0,
                }}
            >
                {title}
            </h3>
            <p
                style={{
                    fontSize: style.descSize,
                    color: 'var(--ink-muted)',
                    margin: 0,
                    maxWidth: '320px',
                    lineHeight: 1.5,
                }}
            >
                {description}
            </p>
            {action && (
                <button
                    onClick={action.onClick}
                    className="sdb-empty-cta"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--accent)',
                        background: 'var(--accent-soft)',
                        border: '1px solid rgba(80,70,229,0.15)',
                        padding: '8px 16px',
                        borderRadius: 'var(--r-sm)',
                        cursor: 'pointer',
                        transition: 'background 0.2s, color 0.2s',
                        marginTop: '4px',
                    }}
                >
                    {action.icon}
                    {action.label}
                </button>
            )}
        </div>
    );
}