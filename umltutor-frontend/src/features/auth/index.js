import authReducer from './authSlice';

export {
    setUser,
    setToken,
    setLoading,
    logout,
    selectIsAuthenticated,
    selectIsGuest,
    selectUser,
    selectToken
} from './authSlice';

export default authReducer;
