import React, { useState } from 'react';
import { X, Send, CheckCircle, FileText, Clock, AlertCircle, BookOpen, Share2, Database } from 'lucide-react';

const SubmitAssignmentModal = ({ isOpen, onClose, onSubmit, isSubmitting, assignmentTitle, assignment }) => {
    const [description, setDescription] = useState('');
    const [agreed, setAgreed] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!agreed) return;
        onSubmit({ description });
    };

    const deadlineRaw = assignment?.deadline || assignment?.dueDate;
    const deadline = deadlineRaw ? new Date(deadlineRaw) : null;
    const now = new Date();
    const msLeft = deadline ? deadline - now : null;
    const hoursLeft = msLeft ? Math.floor(msLeft / (1000 * 60 * 60)) : null;
    const isNearDeadline = hoursLeft !== null && hoursLeft >= 0 && hoursLeft <= 24;
    const isPastDeadline = hoursLeft !== null && hoursLeft < 0;

    const checklist = [
        { icon: Share2, label: 'Use Case Diagram', desc: 'Actors, use cases, system boundary' },
        { icon: FileText, label: 'Use Case Descriptions', desc: 'Flow of events for each use case' },
        { icon: Database, label: 'System Sequence Diagrams', desc: 'One SSD per use case' },
        { icon: Database, label: 'Class Diagram', desc: 'All classes and relationships' },
        { icon: Share2, label: 'Sequence Diagrams', desc: 'Object-level interactions' },
    ];

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
            style={{ background: 'rgba(13,13,20,0.6)', backdropFilter: 'blur(10px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-lg shadow-hover w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden border border-black/5 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-black/5 flex justify-between items-start" style={{ background: '#0D0D14' }}>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 bg-accent rounded-md flex items-center justify-center">
                                <Send size={13} className="text-white" />
                            </div>
                            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/40">Final Submission</p>
                        </div>
                        <h2 className="text-xl font-extrabold text-white leading-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
                            Submit Assignment
                        </h2>
                        <p className="text-sm text-white/50 mt-1 font-medium">{assignmentTitle}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-white/30 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Deadline warning */}
                {deadline && (
                    <div className={`px-8 py-3 flex items-center gap-3 border-b text-xs font-bold ${
                        isPastDeadline ? 'bg-red-50 text-status-red border-red-100' :
                        isNearDeadline ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}>
                        <Clock size={14} />
                        {isPastDeadline
                            ? 'Deadline has passed'
                            : isNearDeadline
                            ? `Due in ${hoursLeft}h — submit soon!`
                            : `Due: ${deadline.toLocaleString()}`
                        }
                    </div>
                )}

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto">
                    <form id="submit-assignment-form" onSubmit={handleSubmit} className="p-8 space-y-6">
                        {/* What's included */}
                        <div>
                            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-accent mb-3 flex items-center gap-2">
                                <CheckCircle size={12} />
                                What Will Be Submitted
                            </h3>
                            <div className="space-y-2">
                                {checklist.map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-surface-3/50 rounded-lg border border-black/5">
                                        <div className="w-7 h-7 bg-accent/10 text-accent rounded-lg flex items-center justify-center shrink-0">
                                            <item.icon size={13} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-extrabold font-heading text-ink">{item.label}</p>
                                            <p className="text-[10px] text-muted">{item.desc}</p>
                                        </div>
                                        <CheckCircle size={14} className="text-status-green shrink-0" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Notes textarea */}
                        <div>
                            <label className="block text-[10px] font-extrabold font-heading text-gray-500 mb-2 uppercase tracking-widest">
                                Submission Notes <span className="text-status-red">*</span>
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                rows={4}
                                placeholder="Describe your solution approach, design decisions, or add any notes for the teacher..."
                                className="w-full px-4 py-3 bg-surface-3 border border-black/8 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent focus:bg-white transition-all text-ink resize-none text-sm font-medium"
                            />
                        </div>

                        {/* Agreement checkbox */}
                        <label className="flex items-start gap-3 p-4 bg-accent/5 border border-accent/15 rounded-lg cursor-pointer hover:bg-accent/10 transition-all group">
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                className="mt-0.5 w-4 h-4 accent-accent cursor-pointer"
                            />
                            <div>
                                <p className="text-xs font-extrabold font-heading text-ink leading-snug">
                                    I confirm this is my own original work
                                </p>
                                <p className="text-[10px] text-muted mt-0.5 font-medium">
                                    By submitting, you agree that this submission represents your original effort and complies with academic integrity policies.
                                </p>
                            </div>
                        </label>

                        {!agreed && description && (
                            <div className="flex items-center gap-2 text-amber-600 text-xs font-bold">
                                <AlertCircle size={14} />
                                Please confirm your work is original before submitting.
                            </div>
                        )}
                    </form>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-black/5 bg-surface-3/30 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 text-muted font-extrabold font-heading hover:bg-gray-200 rounded-lg transition-all uppercase tracking-widest text-xs disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="submit-assignment-form"
                        disabled={isSubmitting || !agreed || !description.trim()}
                        className={`px-8 py-2.5 text-white font-extrabold font-heading rounded-lg shadow-xl transition-all flex items-center gap-2 uppercase tracking-widest text-xs ${
                            isSubmitting || !agreed || !description.trim()
                                ? 'bg-indigo-300 cursor-not-allowed'
                                : 'bg-accent hover:bg-indigo-700 hover:shadow-indigo-200 hover:-translate-y-0.5 active:scale-95'
                        }`}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Send size={14} />
                                Turn In Work
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SubmitAssignmentModal;
