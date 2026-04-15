import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Clock, ChevronRight, BookOpen, Edit } from 'lucide-react';

const AssignmentList = ({ assignments = [], onEdit }) => {
    const navigate = useNavigate();

    if (assignments.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                    <BookOpen size={24} className="text-gray-300" />
                </div>
                <p className="text-gray-400 font-bold italic">No assignments for this class.</p>
                <p className="text-gray-400 text-sm mt-1">Assignments created for this class will appear here.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {assignments.map(asgn => (
                <div 
                    key={asgn.id} 
                    onClick={() => navigate(`/teacher/assignments/${asgn.title.toLowerCase().replace(/\s+/g, '-')}`)}
                    className="flex flex-col bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 transition-all group cursor-pointer overflow-hidden h-full relative"
                >
                    <div className="p-8 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <BookOpen size={24} />
                            </div>
                            <div className="flex gap-2 items-center">
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-lg uppercase tracking-widest">
                                    {asgn.assignmentType || 'TEXT'}
                                </span>
                                {onEdit && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(asgn);
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    >
                                        <Edit size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        <h3 className="text-xl font-black text-gray-900 mb-6 group-hover:text-indigo-600 transition-colors uppercase tracking-tight leading-tight">
                            {asgn.title}
                        </h3>
                        
                        <div className="pt-6 border-t border-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                            <div className="flex items-center gap-2 text-indigo-600">
                                <Clock size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    Due {new Date(asgn.dueDate || asgn.deadline).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                                {asgn.submissionCount !== undefined && (
                                    <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100">
                                        <Layout size={12} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{asgn.submissionCount} Submissions</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5 text-gray-400 group-hover:text-indigo-600 transition-colors ml-auto sm:ml-0">
                                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">View Details</span>
                                    <ChevronRight size={14} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AssignmentList;
