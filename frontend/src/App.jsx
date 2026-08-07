import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import Home from './pages/Home/Home';
import ImageToPDF from './pages/ImageToPDF/ImageToPDF';
import MergePDF from './pages/MergePDF/MergePDF';
import CompressPDF from './pages/CompressPDF/CompressPDF';
import CompressImage from './pages/CompressImage/CompressImage';
import NotFound from './pages/NotFound/NotFound';

function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/image-to-pdf" element={<ImageToPDF />} />
          <Route path="/merge-pdf" element={<MergePDF />} />
          <Route path="/compress-pdf" element={<CompressPDF />} />
          <Route path="/compress-image" element={<CompressImage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
