import React from 'react';
import { Users, BookOpen, ArrowRight, GraduationCap } from 'lucide-react';

/**
 * Shared ClassRow component for both student and teacher dashboards
 * @param {Object} props
 * @param {Object} props.class - Class object
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.showProgress - Show progress bar (student view)
 * @param {number} props.progress - Progress percentage
 * @param {number} props.assignmentsCount - Number of assignments
 * @param {string} props.role - 'student' | 'teacher'
 * @param {string} props.teacherName - Teacher name (student view)
 * @param {number} props.studentCount - Student count (teacher view)
 * @param {number} props.totalAssignments - Total assignments (teacher view)
 */
export default function ClassRow({
    class: cls,
    onClick,
    showProgress = false,
    progress = null,
    assignmentsCount = 0,
    role = 'student',
    teacherName,
    studentCount = 0,
    totalAssignments = 0
}) {
    const avatarChar = cls.name?.charAt(0)?.toUpperCase() || 'C';

    return (
        <div
            className="sdb-class-row"
            onClick={onClick}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => e.key === 'Enter' && onClick?.(e)}
        >
            <div className="sdb-class-avatar">{avatarChar}</div>

            <div className="sdb-class-info">
                <div className="sdb-class-name">{cls.name}</div>

                <div className="sdb-class-meta">
                    {role === 'student' ? (
                        <>
                            <span><Users size={11} /> {teacherName || 'Teacher'}</span>
                            <span><BookOpen size={11} /> {assignmentsCount} assignments</span>
                        </>
                    ) : (
                        <>
                            <span><GraduationCap size={11} /> {studentCount} students</span>
                            <span><BookOpen size={11} /> {totalAssignments} assignments</span>
                        </>
                    )}
                </div>

                {showProgress && progress !== null && (
                    <div className="sdb-class-progress-bar">
                        <div
                            className="sdb-class-progress-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>

            <span className="sdb-class-badge">{cls.code || 'CODE'}</span>
            <ArrowRight size={14} className="sdb-class-arrow" />
        </div>
    );
}