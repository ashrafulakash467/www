import Footer from '@/Components/layout/Footer';
import Header from '@/Components/layout/Header';

export default function MainLayout({ children }) {
    return (
        <div className="flex min-h-screen flex-col">
            <Header />
            <div className="flex-1 pt-30 sm:pt-32.5">{children}</div>
            <Footer />
        </div>
    );
}

