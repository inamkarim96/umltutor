import React, { memo } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';

import {
  openDescription,
  selectIsDescriptionComplete,
} from '../../features/description';

const DescriptionSelector = ({ useCases }) => {
  const dispatch = useAppDispatch();

  return (
    <div className="absolute top-4 right-4 z-10 mr-24 w-64 bg-white rounded-lg shadow-hover border border-black/10 overflow-hidden">
      <div className="px-3 py-2 text-xs font-semibold text-muted bg-surface-3 border-b border-black/10">
        Descriptions
      </div>
      <div className="max-h-72 overflow-y-auto">
        {useCases.length === 0 ? (
          <div className="px-3 py-3 text-sm text-muted">No use cases</div>
        ) : (
          useCases.map((n) => (
            <Row key={n.id} node={n} onClick={() => dispatch(openDescription({ nodeId: n.id }))} />
          ))
        )}
      </div>
    </div>
  );
};

const Row = memo(({ node, onClick }) => {
  const isComplete = useAppSelector((s) => selectIsDescriptionComplete(s, node.id));

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-3 py-2 text-left text-sm hover:bg-surface-3 flex items-center justify-between"
    >
      <span className="truncate text-ink">{node.data?.label ?? 'Use Case'}</span>
      <span className={isComplete ? 'text-status-green' : 'text-gray-300'}>
        {isComplete ? '✓' : '○'}
      </span>
    </button>
  );
});

export default memo(DescriptionSelector);

