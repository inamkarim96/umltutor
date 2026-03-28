import assignmentReducer from './assignmentSlice';

export {
  fetchAllAssignments,
  fetchAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  clearStatus as clearAssignmentStatus,
  setAssignments,
  setAssignmentDetail,
  selectAllAssignments,
  selectAssignmentDetail,
  selectAssignmentLoading,
  selectAssignmentError,
  selectAssignmentSuccess
} from './assignmentSlice';

export { assignmentReducer };
export default assignmentReducer;
