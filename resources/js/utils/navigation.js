import { router, usePage } from '@inertiajs/react';
import { useMemo } from 'react';

export function useRouter() {
    return useMemo(
        () => ({
            push: (url, options = {}) => router.visit(url, options),
            replace: (url, options = {}) => router.visit(url, { ...options, replace: true }),
            post: (url, data = {}, options = {}) => router.post(url, data, options),
            delete: (url, options = {}) => router.delete(url, options),
            back: () => window.history.back(),
            refresh: (options = {}) => router.reload(options),
        }),
        [],
    );
}

export function usePathname() {
    return new URL(usePage().url, window.location.origin).pathname;
}

export function useSearchParams() {
    const url = usePage().url;

    return useMemo(() => new URL(url, window.location.origin).searchParams, [url]);
}
