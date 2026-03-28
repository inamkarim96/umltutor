import React, { useState } from 'react';
import { X, Send, Type, FileJson } from 'lucide-react';

const SubmitAssignmentModal = ({ isOpen, onClose, onSubmit, isSubmitting, assignmentTitle }) => {
    const [description, setDescription] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ description });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 dark:border-gray-800">
                <div className="px-10 py-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">Submit Assignment</h2>
                        <p className="text-sm text-gray-500 font-bold mt-1 uppercase tracking-widest">{assignmentTitle}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-10 overflow-y-auto">
                    <form id="submit-assignment-form" onSubmit={handleSubmit} className="space-y-8">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-800/50 flex items-start gap-4">
                            <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center shadow-sm text-blue-500 shrink-0">
                                <FileJson size={24} />
                            </div>
                            <div>
                                <h3 className="font-black text-blue-900 dark:text-blue-100">Diagram Data Attached</h3>
                                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-1 uppercase tracking-tighter">Your Use Case Diagram, Descriptions, and SSDs will be submitted.</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2 uppercase tracking-widest">
                                <Type size={16} className="text-indigo-500"/> Submission Notes
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                rows="5"
                                placeholder="Describe your solution or add any notes for the teacher..."
                                className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-800 transition-all text-gray-900 dark:text-gray-100 resize-none font-medium text-lg shadow-inner"
                            ></textarea>
                        </div>
                    </form>
                </div>

                <div className="px-10 py-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-8 py-3.5 text-gray-500 font-black hover:bg-gray-200 dark:hover:bg-gray-700 rounded-2xl transition-all uppercase tracking-widest text-xs"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="submit-assignment-form"
                        disabled={isSubmitting}
                        className={`px-10 py-3.5 text-white font-black rounded-2xl shadow-xl transition-all flex items-center gap-3 uppercase tracking-widest text-xs ${
                            isSubmitting
                                ? 'bg-indigo-400 cursor-not-allowed scale-95'
                                : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200 dark:hover:shadow-none hover:-translate-y-1 active:scale-95'
                        }`}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Send size={16} />
                                Submit Work
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SubmitAssignmentModal;
