import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AppProvider } from './context/AppContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Browse from './pages/Browse';
import BusinessDetail from './pages/BusinessDetail';
import Deals from './pages/Deals';
import Favorites from './pages/Favorites';

// Skip-to-content link for keyboard accessibility
function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
    >
      Skip to main content
    </a>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <SkipLink />
        <Navbar />
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/business/:id" element={<BusinessDetail />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/favorites" element={<Favorites />} />
          </Routes>
        </AnimatePresence>
      </AppProvider>
    </BrowserRouter>
  );
}
