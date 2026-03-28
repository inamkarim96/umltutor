import { createSlice, } from '@reduxjs/toolkit';







const initialState = {
  isRunning: false,
  results: null,
  summary: null,
};

const checkingSlice = createSlice({
  name: 'checking',
  initialState,
  reducers: {
    setCheckingRunning: (state, action) => {
      state.isRunning = action.payload !== undefined ? action.payload : true;
    },
    setCheckingResults: (state, action) => {
      state.results = action.payload;
      state.isRunning = false;
    },
    clearResults: (state) => {
      state.results = null;
      state.summary = null;
      state.isRunning = false;
    },
  },
});

export const { setCheckingRunning, setCheckingResults, clearResults } = checkingSlice.actions;
export default checkingSlice.reducer;
