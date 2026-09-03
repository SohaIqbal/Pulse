import { Route, Routes } from 'react-router-dom';
import HeroSection from './components/landing/HeroSection';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HeroSection />} />
    </Routes>
  );
}
