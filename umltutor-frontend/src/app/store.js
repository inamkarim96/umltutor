import { configureStore, combineReducers } from '@reduxjs/toolkit';
import modeReducer from '../features/modes';
import checkingReducer from '../features/checking';
import authReducer from '../features/auth';
import umlReducer from '../features/diagram';
import descriptionReducer from '../features/description';
import classroomReducer from '../features/classroom';
import submissionReducer from '../features/submissions';
import { assignmentReducer } from '../features/assignments';
import notificationReducer from '../features/notifications';

const appReducer = combineReducers({
  mode: modeReducer,
  checking: checkingReducer,
  auth: authReducer,
  uml: umlReducer,
  description: descriptionReducer,
  classroom: classroomReducer,
  submission: submissionReducer,
  assignments: assignmentReducer,
  notifications: notificationReducer,
});

const rootReducer = (state, action) => {
  if (action.type === 'auth/logout') {
    return appReducer(undefined, action);
  }
  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
});

 

