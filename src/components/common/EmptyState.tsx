import React from 'react';

interface EmptyStateProps {
  icon?: string | React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📂',
  title,
  description,
  actionLabel,
  onAction
}) => {
  return (
    <div style={{
      padding: '48px 24px',
      textAlign: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: '16px',
      border: '1px border-subtle',
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      maxWidth: '480px',
      margin: '24px auto'
    }}>
      <div style={{ fontSize: '40px', marginBottom: '16px', lineHeight: 1 }}>
        {icon}
      </div>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#252525', marginBottom: '8px' }}>
        {title}
      </h3>
      <p style={{ color: '#666666', fontSize: '14px', lineHeight: '1.5', marginBottom: actionLabel ? '24px' : '0' }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn btn-primary">
          {actionLabel}
        </button>
      )}
    </div>
  );
};
