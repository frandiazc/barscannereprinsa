import { useState, useRef, useEffect } from 'react';
import { UploadCloud, Camera, CheckCircle2, ScanLine, XCircle, AlertCircle } from 'lucide-react';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';
import './index.css';

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  const { barcodes, isScanning, error, scanImage } = useBarcodeScanner();

  // Handle file selection
  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isCameraActive) stopCamera();

    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);

    // Create an image element to scan
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        scanVideoFrame();
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("No se pudo acceder a la cámara. Por favor verifica los permisos.");
    }
  };

  const stopCamera = () => {
    setIsCameraActive(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const scanVideoFrame = async () => {
    if (!videoRef.current || !isCameraActive) return;
    
    // Only scan if video is playing and has real dimensions
    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && videoRef.current.videoWidth > 0) {
      // Usar un canvas temporal para extraer el frame actual del video
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      // Dibujamos el frame en el canvas
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Enviamos el canvas en lugar del elemento de video directo (evita problemas con la API)
      await scanImage(canvas);
    }
    
    // Request next frame only if camera is still active and we are not scanning too fast
    if (isCameraActive) {
      animationFrameRef.current = requestAnimationFrame(() => {
        setTimeout(scanVideoFrame, 800); // scan every 800ms to allow WASM to process
      });
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo-container">
          <ScanLine className="logo-icon" size={32} />
          <h1>Multi-Barcode Reader</h1>
        </div>
        <p className="subtitle">Detecta múltiples códigos de barras a la vez usando IA</p>
      </header>

      <main className="main-content">
        <section className="scanner-section">
          {/* Controls */}
          <div className="controls">
            <button 
              className={`btn primary ${!isCameraActive && !selectedImage ? 'active' : ''}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud size={20} />
              <span>Subir Imagen</span>
            </button>
            <button 
              className={`btn secondary ${isCameraActive ? 'active' : ''}`}
              onClick={isCameraActive ? stopCamera : startCamera}
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

              {/* Conditional rendering for better React mount/unmount of video */}
              <div className={`video-container ${isCameraActive ? 'active' : 'hidden'}`}>
                <video ref={videoRef} playsInline muted></video>
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
                  <li key={index} className="barcode-item" style={{animationDelay: `${index * 0.1}s`}}>
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
        <p>Desarrollado para la lectura simultánea de etiquetas.</p>
      </footer>
    </div>
  );
}

export default App;
