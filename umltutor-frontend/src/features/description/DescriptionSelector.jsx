import React, { memo } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';

import {
  openDescription,
  selectIsDescriptionComplete,
} from '../../features/description';

const DescriptionSelector = ({ useCases }) => {
  const dispatch = useAppDispatch();

  return (
    <div className="absolute top-4 right-4 z-10 mr-24 w-64 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200">
        Descriptions
      </div>
      <div className="max-h-72 overflow-y-auto">
        {useCases.length === 0 ? (
          <div className="px-3 py-3 text-sm text-gray-500">No use cases</div>
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
      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
    >
      <span className="truncate text-gray-800">{node.data?.label ?? 'Use Case'}</span>
      <span className={isComplete ? 'text-green-600' : 'text-gray-300'}>
        {isComplete ? '✓' : '○'}
      </span>
    </button>
  );
});

export default memo(DescriptionSelector);

