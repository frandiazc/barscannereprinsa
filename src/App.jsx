import { useState, useRef, useEffect } from 'react';
import { UploadCloud, Camera, CheckCircle2, ScanLine, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';
import './index.css';

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const fileInputRef = useRef(null);
  
  const { 
    barcodes, 
    isScanning, 
    error, 
    isSdkReady,
    scanImage, 
    startLiveScanner,
    stopLiveScanner,
    clearBarcodes 
  } = useBarcodeScanner();

  // Handle file selection
  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isCameraActive) stopLivestr();
    clearBarcodes();

    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);

    const img = new Image();
    img.onload = () => {
      scanImage(img);
    };
    img.src = imageUrl;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (fileInputRef.current) {
        fileInputRef.current.files = e.dataTransfer.files;
        handleFileChange({ target: fileInputRef.current });
      }
    }
  };

  const startCamera = async () => {
    setSelectedImage(null);
    clearBarcodes();
    const success = await startLiveScanner("scanbot-camera-view");
    if (success) {
      setIsCameraActive(true);
    }
  };

  const stopLivestr = () => {
    setIsCameraActive(false);
    stopLiveScanner();
  };

  useEffect(() => {
    return () => {
      stopLivestr();
    };
  }, [stopLiveScanner]);

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo-container">
          <ScanLine className="logo-icon" size={32} />
          <h1>Multi-Barcode Reader (Scanbot)</h1>
        </div>
        <p className="subtitle">Detecta múltiples códigos de barras a la vez rápidamente</p>
      </header>

      <main className="main-content">
        <section className="scanner-section">
          {/* Controls */}
          <div className="controls">
            <button 
              className={`btn primary ${!isCameraActive && !selectedImage ? 'active' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              disabled={!isSdkReady}
            >
              <UploadCloud size={20} />
              <span>Subir Imagen</span>
            </button>
            <button 
              className={`btn secondary ${isCameraActive ? 'active' : ''}`}
              onClick={isCameraActive ? stopLivestr : startCamera}
              disabled={!isSdkReady}
            >
              {isCameraActive ? <XCircle size={20} /> : <Camera size={20} />}
              <span>{isCameraActive ? 'Detener Cámara' : 'Usar Cámara'}</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden-input" 
            />
          </div>

          {!isSdkReady && (
             <div style={{ textAlign: 'center', margin: '1rem', color: '#a5b4fc', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Loader2 className="spinning-icon" size={20} />
                Cargando motor de Scanbot...
             </div>
          )}

          {/* Viewport */}
          <div className="scanner-viewport-glass">
            <div 
              className="scanner-viewport"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              {!selectedImage && !isCameraActive && (
                <div className="empty-state">
                  <div className="icon-pulse">
                    <ScanLine size={48} />
                  </div>
                  <h3>Listo para escanear</h3>
                  <p>Arrastra una foto de tus etiquetas aquí o usa los botones de arriba.</p>
                </div>
              )}

              {selectedImage && (
                <div className="image-preview-container">
                  <img src={selectedImage} alt="Selected" className="image-preview" />
                  {isScanning && <div className="scanning-overlay"><div className="laser-line"></div></div>}
                </div>
              )}

              {/* Scanbot Video Container */}
              <div 
                id="scanbot-camera-view" 
                style={{
                  width: '100%', 
                  height: '100%', 
                  display: isCameraActive ? 'block' : 'none',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '16px'
                }}
              >
                  {isCameraActive && <div className="scanning-overlay"><div className="laser-line"></div></div>}
              </div>

            </div>
          </div>
        </section>

        <section className="results-section">
          <div className="results-header">
            <h2>Resultados Detectados</h2>
            <div className="badge">{barcodes.length}</div>
          </div>
          
          <div className="results-container">
            {error && (
              <div className="error-message">
                <AlertCircle size={20} />
                <p>{error}</p>
              </div>
            )}
            
            {barcodes.length === 0 && !error && (
              <div className="no-results">
                <p>No se encontraron códigos aún...</p>
              </div>
            )}

            {barcodes.length > 0 && (
              <ul className="barcode-list">
                {barcodes.map((code, index) => (
                  <li key={`${code.value}-${index}`} className="barcode-item" style={{animationDelay: `${index * 0.1}s`}}>
                    <div className="barcode-icon">
                      <CheckCircle2 color="#10b981" size={24} />
                    </div>
                    <div className="barcode-details">
                      <span className="barcode-custom-label" style={{ fontSize: '0.8rem', color: '#a5b4fc', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{code.customLabel}</span>
                      <span className="barcode-value">{code.value}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
      
      <footer className="footer">
        <p>Desarrollado para la lectura simultánea de etiquetas con Scanbot.</p>
      </footer>
    </div>
  );
}

export default App;
