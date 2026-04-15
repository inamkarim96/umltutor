import classroomReducer from './classroomSlice';

// --- Classroom Exports ---
export {
  fetchClasses,
  fetchClassStudents,
  createClass,
  joinClass,
  addStudentToClass,
  removeStudentFromClass,
  fetchClassAnalytics,
  setClasses,
  selectClasses,
  selectStudents,
  selectClassroomLoading,
  selectClassroomError,
  selectClassAnalytics
} from './classroomSlice';

export { classroomReducer };

// --- Components ---
export { default as SubmitAssignment } from './components/SubmitAssignment';
export { default as SubmitAssignmentModal } from './components/SubmitAssignmentModal';

export default classroomReducer;
