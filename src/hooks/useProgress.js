import { useContext } from 'react';
import { ProgressContext } from '../context/ProgressContext.jsx';

/**
 * Custom React hook to access the canonical ProgressContext state and methods.
 * @returns {object} Progress context object
 */
export function useProgress() {
    const context = useContext(ProgressContext);
    if (!context) {
        throw new Error('useProgress must be used within a ProgressProvider');
    }
    return context;
}
