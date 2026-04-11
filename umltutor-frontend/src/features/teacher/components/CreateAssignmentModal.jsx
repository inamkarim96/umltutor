import React, { useState } from 'react';
import { X, Calendar, Edit3, Type, Upload, FileText } from 'lucide-react';

const CreateAssignmentModal = ({ isOpen, onClose, onSubmit, isSubmitting, initialData = null }) => {
    const isEditMode = !!initialData;

    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        deadline: initialData?.deadline ? new Date(initialData.deadline).toISOString().split('T')[0] : '',
        assignmentType: initialData?.assignmentType || 'TEXT',
        releaseDate: initialData?.releaseDate ? new Date(initialData.releaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        maxScore: initialData?.maxScore?.toString() || '',
        textContent: initialData?.textContent || '',
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileError, setFileError] = useState('');
    const [removeExistingFile, setRemoveExistingFile] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    // Reset form when modal opens or initialData changes
    React.useEffect(() => {
        if (isOpen) {
            setFormData({
                title: initialData?.title || '',
                deadline: initialData?.dueDate || initialData?.deadline ? new Date(initialData.dueDate || initialData.deadline).toISOString().split('T')[0] : '',
                assignmentType: initialData?.type || initialData?.assignmentType || 'TEXT',
                releaseDate: initialData?.releaseDate ? new Date(initialData.releaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                maxScore: initialData?.maxScore?.toString() || '',
                textContent: initialData?.textContent || '',
            });
            setSelectedFile(null);
            setFileError('');
            setRemoveExistingFile(false);
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'assignmentType' && value === 'TEXT') {
            setSelectedFile(null);
            setFileError('');
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setFileError('');
        if (!file) {
            setSelectedFile(null);
            return;
        }
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/png',
            'image/jpeg',
            'image/jpg',
        ];
        const maxSize = 10 * 1024 * 1024;
        if (!allowedTypes.includes(file.type)) {
            setFileError('Invalid file type. Allowed: PDF, DOC, DOCX, PNG, JPG.');
            return;
        }
        if (file.size > maxSize) {
            setFileError('File too large. Maximum size is 10MB.');
            return;
        }
        setSelectedFile(file);
        setRemoveExistingFile(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validation for new creation
        if (!isEditMode && formData.assignmentType === 'FILE' && !selectedFile) {
            setFileError('Please select a file to upload.');
            return;
        }

        if (formData.assignmentType === 'FILE' && (selectedFile || isEditMode)) {
            const fd = new FormData();
            fd.append('title', formData.title);
            fd.append('assignmentType', 'FILE');
            fd.append('releaseDate', formData.releaseDate);
            fd.append('deadline', formData.deadline);
            fd.append('maxScore', formData.maxScore);
            
            if (selectedFile) {
                fd.append('assignmentFile', selectedFile);
            }
            if (isEditMode) {
                fd.append('id', initialData.id);
                if (removeExistingFile) fd.append('removeExistingFile', 'true');
            }
            
            onSubmit(fd);
        } else {
            const submissionData = {
                title: formData.title,
                assignmentType: 'TEXT',
                releaseDate: formData.releaseDate,
                deadline: formData.deadline,
                maxScore: formData.maxScore,
                textContent: formData.textContent,
            };
            onSubmit(submissionData);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-2xl font-black text-gray-900">{isEditMode ? 'Edit Assignment' : 'Create Assignment'}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto">
                    <form id="assignment-form" onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <Edit3 size={16} className="text-indigo-500"/> Assignment Title
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                required
                                placeholder="e.g., UML Class Diagram Exercise"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-900 font-medium"
                            />
                        </div>



                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <Calendar size={16} className="text-indigo-500"/> Deadline (Due Date)
                            </label>
                            <input
                                type="date"
                                name="deadline"
                                value={formData.deadline}
                                onChange={handleChange}
                                required
                                min={!isEditMode ? new Date().toISOString().split('T')[0] : undefined}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-900 font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <Type size={16} className="text-indigo-500"/> Assignment Type
                            </label>
                            <select
                                name="assignmentType"
                                value={formData.assignmentType}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-900 font-medium"
                            >
                                <option value="TEXT">Text Assignment</option>
                                <option value="FILE">File Assignment</option>
                            </select>
                        </div>

                        {formData.assignmentType === 'TEXT' && (
                            <div className="animate-in fade-in duration-200">
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <FileText size={16} className="text-indigo-500"/> Assignment Text Content
                                </label>
                                <textarea
                                    name="textContent"
                                    value={formData.textContent}
                                    onChange={handleChange}
                                    required
                                    rows="5"
                                    placeholder="Enter the full text content of this assignment here..."
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-900 resize-none font-medium"
                                />
                            </div>
                        )}

                        {formData.assignmentType === 'FILE' && (
                            <div className="animate-in fade-in duration-200">
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <Upload size={16} className="text-indigo-500"/> {isEditMode ? 'Update File' : 'Upload File'}
                                </label>
                                
                                {isEditMode && initialData.assignmentFileName && !selectedFile && !removeExistingFile && (
                                    <div className="mb-3 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <FileText size={14} className="text-indigo-500 shrink-0"/>
                                            <span className="text-xs font-bold text-indigo-700 truncate">{initialData.assignmentFileName}</span>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => setRemoveExistingFile(true)}
                                            className="text-[10px] font-black uppercase text-red-500 hover:text-red-700"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}

                                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${selectedFile ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50'}`}>
                                    <input
                                        type="file"
                                        id="file-input"
                                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    {selectedFile ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                                <FileText size={20} className="text-indigo-600" />
                                            </div>
                                            <p className="text-sm font-bold text-indigo-700">{selectedFile.name}</p>
                                            <p className="text-xs text-gray-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                            <button
                                                type="button"
                                                onClick={() => { setSelectedFile(null); }}
                                                className="text-xs text-red-500 hover:text-red-700 font-bold mt-1"
                                            >
                                                Undo selection
                                            </button>
                                        </div>
                                    ) : (
                                        <label htmlFor="file-input" className="cursor-pointer flex flex-col items-center gap-2">
                                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                                <Upload size={20} className="text-gray-400" />
                                            </div>
                                            <p className="text-sm font-bold text-gray-600">
                                                {isEditMode ? 'Click to replace existing file' : 'Click to upload a file'}
                                            </p>
                                            <p className="text-xs text-gray-400">PDF, DOC, DOCX, PNG, JPG — max 10MB</p>
                                        </label>
                                    )}
                                </div>
                                {fileError && <p className="mt-2 text-xs font-bold text-red-500">{fileError}</p>}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <Calendar size={16} className="text-indigo-500"/> Release Date
                                </label>
                                <input
                                    type="date"
                                    name="releaseDate"
                                    value={formData.releaseDate}
                                    onChange={handleChange}
                                    required
                                    max={formData.deadline}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-900 font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <Type size={16} className="text-indigo-500"/> Max Score
                                </label>
                                <input
                                    type="number"
                                    name="maxScore"
                                    value={formData.maxScore}
                                    onChange={handleChange}
                                    required
                                    min="1"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-gray-900 font-medium"
                                />
                            </div>
                        </div>
                    </form>
                </div>

                <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="assignment-form"
                        disabled={isSubmitting}
                        className={`px-8 py-2.5 text-white font-black rounded-xl shadow-lg transition-all ${
                            isSubmitting
                                ? 'bg-indigo-400 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5'
                        }`}
                    >
                        {isSubmitting ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Assignment')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateAssignmentModal;
