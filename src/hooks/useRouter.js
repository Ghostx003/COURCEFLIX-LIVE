import { useRouterContext, parseLocation, serializeLocation } from '../context/RouterContext.jsx';

/**
 * Custom React Hook for accessing and controlling CourseFlix routing.
 * Provides current active view, route parameters, navigation functions,
 * and canonical location serializers.
 */
export function useRouter() {
    const context = useRouterContext();

    if (!context) {
        // Fallback for components rendered outside RouterProvider
        return {
            currentView: typeof window !== 'undefined' && window.location.hash ? window.location.hash.substring(1) : 'dashboard-view',
            params: {},
            navigate: (viewId, pushState = true) => {
                if (typeof window !== 'undefined' && typeof window.switchView === 'function') {
                    window.switchView(viewId, pushState);
                } else if (typeof window !== 'undefined') {
                    window.location.hash = `#${viewId}`;
                }
            },
            goBack: () => {
                if (typeof window !== 'undefined') window.history.back();
            },
            goForward: () => {
                if (typeof window !== 'undefined') window.history.forward();
            },
            parseLocation,
            serializeLocation
        };
    }

    return context;
}
