import '../css/app.css';
import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import MainLayout from '@/Layouts/MainLayout';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';

library.add(fas);

const applicationName = import.meta.env.VITE_APP_NAME || 'Healthcare Platform';

function syncAuth(page) {
    window.__healthcareAuth = page?.props?.auth ?? { user: null, role: null };
}

createInertiaApp({
    title: (title) => (title ? `${title} - ${applicationName}` : applicationName),
    resolve: async (name) => {
        const page = await resolvePageComponent(
            [`./Pages/${name}.jsx`, `./Pages/${name}.tsx`, `./Pages/${name}.js`, `./Pages/${name}.ts`],
            import.meta.glob('./Pages/**/*.{js,jsx,ts,tsx}'),
        );

        page.default.layout ??= (content) => <MainLayout>{content}</MainLayout>;

        return page;
    },
    setup({ el, App, props }) {
        syncAuth(props.initialPage);
        createRoot(el).render(<App {...props} />);
    },
    progress: {
        color: '#345c32',
    },
});

router.on('success', (event) => syncAuth(event.detail.page));
