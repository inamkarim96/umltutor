import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { fetchClassAnalytics, selectClassAnalytics } from '../../classroom';

import { 
    Users, 
    BookOpen, 
    Activity, 
    Award, 
    TrendingUp, 
    CheckCircle,
    AlertCircle,
    ArrowUpRight
} from 'lucide-react';

const TeacherAnalytics = ({ classId }) => {
    const dispatch = useAppDispatch();
    const analytics = useAppSelector((state) => selectClassAnalytics(state, classId));

    useEffect(() => {
        if (classId) {
            dispatch(fetchClassAnalytics(classId));
        }
    }, [dispatch, classId]);

    if (!analytics) {
        return (
            <div className="p-12 text-center bg-white rounded-[2rem] border border-gray-100 shadow-sm">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-400 font-black italic uppercase tracking-widest text-[10px]">Calculating Analytics...</p>
            </div>
        );
    }

    const cards = [
        {
            label: 'Total Students',
            value: analytics.totalStudents,
            icon: <Users size={20} />,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            trend: 'Class Capacity'
        },
        {
            label: 'Assignments',
            value: analytics.totalAssignments,
            icon: <BookOpen size={20} />,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50',
            trend: 'Active Tasks'
        },
        {
            label: 'Submission Rate',
            value: `${analytics.submissionRate}%`,
            icon: <Activity size={20} />,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            trend: `${analytics.totalSubmissions} Total`,
            progress: analytics.submissionRate
        },
        {
            label: 'Average Grade',
            value: analytics.averageGrade > 0 ? analytics.averageGrade.toFixed(1) : 'N/A',
            icon: <Award size={20} />,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50',
            trend: 'Performance Avg'
        }
    ];

    return (
        <div className="space-y-8">
            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                        <div className="flex justify-between items-start mb-6">
                            <div className={`w-12 h-12 ${card.bgColor} ${card.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
                                {card.icon}
                            </div>
                           
                        </div>
                        
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-indigo-600 transition-colors">
                                {card.label}
                            </p>
                            <h3 className="text-3xl font-black text-gray-900 leading-none">{card.value}</h3>
                        </div>

                        {card.progress !== undefined && (
                            <div className="mt-6">
                                <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${card.progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{card.trend}</span>
                            <ArrowUpRight size={14} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                        </div>
                    </div>
                ))}
            </div>

           
        </div>
    );
};

export default TeacherAnalytics;
