import React, { useState } from 'react';

const AssignmentFileViewer = ({
    fileUrl,
    fileName,
    className = ''
}) => {
    const [viewMode, setViewMode] = useState('preview');

    if (!fileUrl) {
        return (
            <div className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center ${className}`}>
                <div className="text-4xl mb-3">📄</div>
                <p className="text-gray-600 dark:text-gray-400">No assignment file available</p>
            </div>
        );
    }

    const fileExtension = fileName?.split('.').pop()?.toLowerCase();
    const isPDF = fileExtension === 'pdf';
    const isWord = fileExtension === 'doc' || fileExtension === 'docx';

    const handleViewPDF = () => {
        if (!isPDF || !fileUrl) return;
        window.open(fileUrl, '_blank');
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName || 'assignment';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden ${className}`}>
            {/* Header */}
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="text-2xl">
                        {isPDF ? '📕' : isWord ? '📘' : '📄'}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {fileName || 'Assignment File'}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {isPDF ? 'PDF Document' : isWord ? 'Word Document' : 'Document'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isPDF && (
                        <div className="flex bg-gray-200 dark:bg-gray-600 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('preview')}
                                className={`px-3 py-1 text-sm rounded-md transition-colors ${viewMode === 'preview'
                                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                                    }`}
                            >
                                Preview
                            </button>
                            <button
                                onClick={() => setViewMode('download')}
                                className={`px-3 py-1 text-sm rounded-md transition-colors ${viewMode === 'download'
                                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                                    }`}
                            >
                                Download
                            </button>
                        </div>
                    )}
                    <button
                        onClick={handleDownload}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="bg-gray-100 dark:bg-gray-900">
                {isPDF && viewMode === 'preview' ? (
                    <div className="p-8 text-center">
                        <div className="max-w-md mx-auto">
                            <div className="text-6xl mb-4">📕</div>
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">PDF Document</h4>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">Click the button below to view the PDF in a new tab.</p>
                            <button
                                onClick={handleViewPDF}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium inline-flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View PDF
                            </button>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">The PDF will open in a new tab for better viewing experience.</p>
                        </div>
                    </div>
                ) : isWord ? (
                    <div className="p-8 text-center">
                        <div className="max-w-md mx-auto">
                            <div className="text-6xl mb-4">📘</div>
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Word Document</h4>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">Preview is not available for Word documents. Please download the file to view it.</p>
                            <button
                                onClick={handleDownload}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium inline-flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download {fileName}
                            </button>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">You'll need Microsoft Word or a compatible application to open this file.</p>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 text-center">
                        <div className="max-w-md mx-auto">
                            <div className="text-6xl mb-4">📄</div>
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Download Required</h4>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">Click the button below to download the assignment file.</p>
                            <button
                                onClick={handleDownload}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium inline-flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download File
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AssignmentFileViewer;
