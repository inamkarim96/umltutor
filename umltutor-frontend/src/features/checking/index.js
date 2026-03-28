import checkingReducer from './checkingSlice';

export {
    setCheckingRunning,
    setCheckingResults,
    clearResults
} from './checkingSlice';

export * from './ConsistencyChecker';

export { default as CheckingModePanel } from './CheckingModePanel';

export default checkingReducer;
