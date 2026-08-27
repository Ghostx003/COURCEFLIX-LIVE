import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { handleViewTransition } from '../services/viewLifecycleService.js';

const RouterContext = createContext(null);

/**
 * Parses a URL hash string into a canonical route object { view, params }.
 * Handles standard views (#dashboard-view, #home-view),
 * subcourse direct links (#subcourse/<id>/<path>),
 * and DPP shortcuts (#dpp/<id>, #pb/<id>).
 */
export function parseLocation(hashString = '') {
    let cleanHash = hashString.startsWith('#') ? hashString.substring(1) : hashString;
    cleanHash = decodeURIComponent(cleanHash).trim();

    if (!cleanHash || cleanHash === 'home-view') {
        return { view: 'home-view', params: {} };
    }

    if (cleanHash === 'filter-results-view') {
        return { view: 'home-view', params: {} };
    }

    // Subcourse route: #subcourse/<courseId>/<path...>
    if (cleanHash.startsWith('subcourse/')) {
        const afterPrefix = cleanHash.substring('subcourse/'.length);
        const parts = afterPrefix.split('/');
        const courseId = parts[0];
        const subpath = parts.slice(1).join('/');
        return {
            view: 'subcourse-view',
            params: { courseId, path: subpath || '' }
        };
    }

    // DPP / Practice route: #dpp/<courseId> or #pb/<courseId>
    if (cleanHash.startsWith('dpp/') || cleanHash.startsWith('pb/')) {
        const parts = cleanHash.split('/');
        const courseId = parts[1] || '';
        return {
            view: 'dpp-view',
            params: { courseId }
        };
    }

    // Standard view: e.g. #dashboard-view, #goals-view, #notes-view
    if (cleanHash.endsWith('-view')) {
        return { view: cleanHash, params: {} };
    }

    // If it contains a slash, might be courseId/subfolder
    if (cleanHash.includes('/')) {
        const parts = cleanHash.split('/');
        return {
            view: 'subcourse-view',
            params: { courseId: parts[0], path: parts.slice(1).join('/') }
        };
    }

    // Default match as view identifier
    return { view: cleanHash, params: {} };
}

/**
 * Serializes a view and params into a canonical URL hash string.
 */
export function serializeLocation(view, params = {}) {
    if (!view || view === 'home-view') {
        return '#home-view';
    }

    if (view === 'player-view') {
        return ''; // Player view avoids setting a hash; state is persisted in sessionStorage
    }

    if (view === 'subcourse-view') {
        const cid = params.courseId || '';
        const path = params.path ? `/${encodeURIComponent(params.path)}` : '';
        return cid ? `#subcourse/${cid}${path}` : '#dashboard-view';
    }

    if (view === 'dpp-view' && params.courseId) {
        return `#dpp/${params.courseId}`;
    }

    return `#${view}`;
}

/**
 * Resolves initial active view on startup preserving exact CourseFlix precedence:
 * 1. sessionStorage:courseflixState (for player reload restoration)
 * 2. URL hash
 * 3. Default fallback: 'dashboard-view' (or 'home-view')
 */
function resolveInitialRoute() {
    if (typeof window === 'undefined') {
        return { view: 'dashboard-view', params: {} };
    }

    // 1. Check player session state in sessionStorage
    try {
        const savedStateJSON = sessionStorage.getItem('courseflixState');
        if (savedStateJSON) {
            const saved = JSON.parse(savedStateJSON);
            const navEntries = performance.getEntriesByType('navigation');
            const isReload = navEntries.length > 0 && navEntries[0].type === 'reload';
            const isFromExternal = navEntries.length > 0 && navEntries[0].type === 'navigate' && document.referrer && !document.referrer.endsWith('index.html');
            const isExplicit = !isReload && (isFromExternal || (window.location.hash && window.location.hash !== '#player-view'));

            if (!isExplicit && saved.view === 'player-view') {
                return {
                    view: 'player-view',
                    params: {
                        courseId: saved.courseId,
                        lectureId: saved.lectureId,
                        currentTime: saved.currentTime,
                        subfolder: saved.subfolder,
                        lastView: saved.lastView,
                        isGoalsPlaylist: saved.isGoalsPlaylist
                    }
                };
            }
        }
    } catch (e) {
        console.warn('[Router] Failed to parse initial sessionStorage state', e);
    }

    // 2. Check URL Hash
    if (window.location.hash) {
        return parseLocation(window.location.hash);
    }

    // 3. Fallback
    return { view: 'dashboard-view', params: {} };
}

export function RouterProvider({ children }) {
    const initialRoute = resolveInitialRoute();
    const [currentView, setCurrentView] = useState(initialRoute.view);
    const [params, setParams] = useState(initialRoute.params);
    const historyStack = useRef([]);
    const isInternalNavigating = useRef(false);

    const navigate = useCallback((targetView, options = {}) => {
        const {
            params: newParams = {},
            pushState = true,
            replace = false,
            origin = null
        } = options;

        let resolvedView = targetView;
        let resolvedParams = { ...newParams };

        // Support passing raw hashes (e.g. navigate('#goals-view'))
        if (typeof targetView === 'string' && (targetView.startsWith('#') || targetView.startsWith('subcourse/'))) {
            const parsed = parseLocation(targetView);
            resolvedView = parsed.view;
            resolvedParams = { ...parsed.params, ...newParams };
        }

        const prevView = currentView;
        if (prevView !== resolvedView && prevView !== 'player-view') {
            historyStack.current.push({ view: prevView, params });
        }

        setCurrentView(resolvedView);
        setParams(resolvedParams);

        // Update URL hash safely without triggering duplicate navigation loops
        if (pushState && resolvedView !== 'player-view') {
            const serializedHash = serializeLocation(resolvedView, resolvedParams);
            if (serializedHash && window.location.hash !== serializedHash) {
                isInternalNavigating.current = true;
                if (replace) {
                    window.history.replaceState(null, '', serializedHash);
                } else {
                    window.history.pushState(null, '', serializedHash);
                }
                setTimeout(() => {
                    isInternalNavigating.current = false;
                }, 20);
            }
        }

        // Apply DOM class and audio/video lifecycle updates
        handleViewTransition(resolvedView, prevView, { pushState });
    }, [currentView, params]);

    const goBack = useCallback((fallbackView = 'dashboard-view') => {
        if (historyStack.current.length > 0) {
            const previous = historyStack.current.pop();
            navigate(previous.view, { params: previous.params, pushState: true });
        } else {
            navigate(fallbackView, { pushState: true });
        }
    }, [navigate]);

    const goForward = useCallback(() => {
        if (typeof window !== 'undefined') {
            window.history.forward();
        }
    }, []);

    // Listen to browser hash changes (Back/Forward buttons or direct URL change)
    useEffect(() => {
        const handleHashChange = () => {
            if (isInternalNavigating.current) return;

            const parsed = parseLocation(window.location.hash);
            if (parsed.view !== currentView) {
                setCurrentView(parsed.view);
                setParams(parsed.params);
                handleViewTransition(parsed.view, currentView, { pushState: false });
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        window.addEventListener('popstate', handleHashChange);

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
            window.removeEventListener('popstate', handleHashChange);
        };
    }, [currentView]);

    // Install the legacy switchView compatibility bridge
    useEffect(() => {
        window.switchView = function(viewId, pushState = true) {
            navigate(viewId, { pushState });
        };
    }, [navigate]);

    // Initial lifecycle side effect application
    useEffect(() => {
        handleViewTransition(currentView, null, { pushState: false });
    }, []);

    const value = {
        currentView,
        params,
        navigate,
        goBack,
        goForward,
        parseLocation,
        serializeLocation
    };

    return (
        <RouterContext.Provider value={value}>
            {children}
        </RouterContext.Provider>
    );
}

export function useRouterContext() {
    return useContext(RouterContext);
}
