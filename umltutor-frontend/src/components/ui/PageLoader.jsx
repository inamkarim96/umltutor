import React from 'react';

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh] bg-transparent">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto" />
      <p className="mt-4 text-muted">Loading...</p>
    </div>
  </div>
);

export default PageLoader;
