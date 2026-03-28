import { configureStore } from '@reduxjs/toolkit';
import modeReducer from '../features/modes';
import checkingReducer from '../features/checking';
import authReducer from '../features/auth';
import umlReducer from '../features/diagram';
import descriptionReducer from '../features/description';
import classroomReducer from '../features/classroom';
import submissionReducer from '../features/submissions';
import { assignmentReducer } from '../features/assignments';
import notificationReducer from '../features/notifications';


export const store = configureStore({
  reducer: {
    mode: modeReducer,
    checking: checkingReducer,
    auth: authReducer,
    uml: umlReducer,
    description: descriptionReducer,
    classroom: classroomReducer,
    submission: submissionReducer,
    assignments: assignmentReducer,
    notifications: notificationReducer,
  },
});

 

