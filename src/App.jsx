import { useState, useRef, useEffect } from 'react';
import { UploadCloud, Camera, CheckCircle2, ScanLine, XCircle, AlertCircle, Loader2, Trash2, Download, RotateCcw, Package, Hash, CircleDot } from 'lucide-react';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';
import { useProductList } from './hooks/useProductList';
import './index.css';

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
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

  const {
    currentProduct,
    productList,
    lastConfirmedAt,
    filledSlots,
    addBarcode,
    confirmProduct,
    resetCurrentProduct,
    removeProduct,
    clearList,
    exportCSV
  } = useProductList();

  // When new barcodes are detected, feed them into the product list
  useEffect(() => {
    if (barcodes.length > 0) {
      barcodes.forEach(code => addBarcode(code));
    }
  }, [barcodes, addBarcode]);

  // Flash effect on product confirmation
  const [showFlash, setShowFlash] = useState(false);
  useEffect(() => {
    if (lastConfirmedAt) {
      setShowFlash(true);
      const timer = setTimeout(() => setShowFlash(false), 800);
      return () => clearTimeout(timer);
    }
  }, [lastConfirmedAt]);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (isCameraActive) stopCam();
    clearBarcodes();
    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    const img = new Image();
    img.onload = () => scanImage(img);
    img.src = imageUrl;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length > 0 && fileInputRef.current) {
      fileInputRef.current.files = e.dataTransfer.files;
      handleFileChange({ target: fileInputRef.current });
    }
  };

  const startCamera = async () => {
    setSelectedImage(null);
    clearBarcodes();
    const success = await startLiveScanner("scanbot-camera-view");
    if (success) setIsCameraActive(true);
  };

  const stopCam = () => {
    setIsCameraActive(false);
    stopLiveScanner();
  };

  useEffect(() => {
    return () => stopCam();
  }, [stopLiveScanner]);

  const handleClearAll = () => {
    if (showConfirmClear) {
      clearList();
      setShowConfirmClear(false);
    } else {
      setShowConfirmClear(true);
      setTimeout(() => setShowConfirmClear(false), 3000);
    }
  };

  return (
    <div className="app-container">
      {/* Confirmation flash overlay */}
      {showFlash && <div className="confirm-flash" />}

      <header className="header">
        <div className="logo-container">
          <ScanLine className="logo-icon" size={28} />
          <h1>EprinScanner Pro</h1>
        </div>
        <p className="subtitle">Sistema de escaneo profesional de etiquetas</p>
      </header>

      <main className="main-layout">
        {/* LEFT COLUMN: Scanner + Current Product */}
        <div className="left-column">
          {/* Scanner Section */}
          <section className="scanner-section">
            <div className="controls">
              <button 
                className={`btn primary ${!isCameraActive && !selectedImage ? 'active' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={!isSdkReady}
              >
                <UploadCloud size={18} />
                <span>Imagen</span>
              </button>
              <button 
                className={`btn secondary ${isCameraActive ? 'active' : ''}`}
                onClick={isCameraActive ? stopCam : startCamera}
                disabled={!isSdkReady}
              >
                {isCameraActive ? <XCircle size={18} /> : <Camera size={18} />}
                <span>{isCameraActive ? 'Parar' : 'Cámara'}</span>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden-input" />
            </div>

            {!isSdkReady && (
              <div className="sdk-loading">
                <Loader2 className="spinning-icon" size={18} />
                Cargando Scanbot...
              </div>
            )}

            <div className="scanner-viewport-glass">
              <div className="scanner-viewport" onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
                {!selectedImage && !isCameraActive && (
                  <div className="empty-state">
                    <div className="icon-pulse"><ScanLine size={40} /></div>
                    <h3>Listo para escanear</h3>
                    <p>Apunta la cámara a una etiqueta con 3 códigos</p>
                  </div>
                )}
                {selectedImage && (
                  <div className="image-preview-container">
                    <img src={selectedImage} alt="Selected" className="image-preview" />
                    {isScanning && <div className="scanning-overlay"><div className="laser-line" /></div>}
                  </div>
                )}
                <div id="scanbot-camera-view" style={{
                  width: '100%', height: '100%',
                  display: isCameraActive ? 'block' : 'none',
                  position: 'relative', overflow: 'hidden', borderRadius: '12px'
                }}>
                  {isCameraActive && <div className="scanning-overlay"><div className="laser-line" /></div>}
                </div>
              </div>
            </div>

            {error && (
              <div className="error-message">
                <AlertCircle size={16} />
                <p>{error}</p>
              </div>
            )}
          </section>

          {/* Current Product Card */}
          <section className={`current-product-card ${filledSlots === 3 ? 'complete' : ''}`}>
            <div className="card-header">
              <Package size={18} />
              <h3>Producto Actual</h3>
              <span className="slot-counter">{filledSlots}/3</span>
            </div>
            <div className="product-slots">
              <div className={`slot ${currentProduct.almacen ? 'filled' : ''}`}>
                <div className="slot-icon">
                  {currentProduct.almacen ? <CheckCircle2 size={16} color="#10b981" /> : <CircleDot size={16} />}
                </div>
                <div className="slot-info">
                  <span className="slot-label">Almacén</span>
                  <span className="slot-value">{currentProduct.almacen || 'Esperando...'}</span>
                </div>
              </div>
              <div className={`slot ${currentProduct.sn ? 'filled' : ''}`}>
                <div className="slot-icon">
                  {currentProduct.sn ? <CheckCircle2 size={16} color="#10b981" /> : <CircleDot size={16} />}
                </div>
                <div className="slot-info">
                  <span className="slot-label">SN</span>
                  <span className="slot-value">{currentProduct.sn || 'Esperando...'}</span>
                </div>
              </div>
              <div className={`slot ${currentProduct.epricode ? 'filled' : ''}`}>
                <div className="slot-icon">
                  {currentProduct.epricode ? <CheckCircle2 size={16} color="#10b981" /> : <CircleDot size={16} />}
                </div>
                <div className="slot-info">
                  <span className="slot-label">Epricode</span>
                  <span className="slot-value">{currentProduct.epricode || 'Esperando...'}</span>
                </div>
              </div>
            </div>
            <div className="card-actions">
              <button className="btn-sm" onClick={resetCurrentProduct} disabled={filledSlots === 0}>
                <RotateCcw size={14} /> Reiniciar
              </button>
              <button className="btn-sm btn-confirm" onClick={confirmProduct} disabled={filledSlots === 0}>
                <CheckCircle2 size={14} /> Confirmar Parcial
              </button>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Product List */}
        <section className="product-list-section">
          <div className="list-header">
            <div className="list-title">
              <Hash size={18} />
              <h2>Lista de Productos</h2>
              <span className="badge">{productList.length}</span>
            </div>
            <div className="list-actions">
              <button className="btn-icon" onClick={exportCSV} disabled={productList.length === 0} title="Exportar CSV">
                <Download size={16} />
              </button>
              <button 
                className={`btn-icon ${showConfirmClear ? 'danger' : ''}`} 
                onClick={handleClearAll} 
                disabled={productList.length === 0}
                title={showConfirmClear ? '¿Confirmar borrar todo?' : 'Limpiar lista'}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="product-list-container">
            {productList.length === 0 ? (
              <div className="no-results">
                <p>Escanea etiquetas para crear la lista...</p>
              </div>
            ) : (
              <div className="product-list">
                {[...productList].reverse().map((product, i) => (
                  <div key={product.id} className="product-row" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="product-number">{productList.length - i}</div>
                    <div className="product-codes">
                      <div className="code-chip almacen">
                        <span className="chip-label">ALM</span>
                        <span className="chip-value">{product.almacen}</span>
                      </div>
                      <div className="code-chip sn">
                        <span className="chip-label">SN</span>
                        <span className="chip-value">{product.sn}</span>
                      </div>
                      <div className="code-chip epricode">
                        <span className="chip-label">EPI</span>
                        <span className="chip-value">{product.epricode}</span>
                      </div>
                    </div>
                    <div className="product-meta">
                      <span className="product-time">{new Date(product.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                      <button className="btn-delete" onClick={() => removeProduct(product.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      
      <footer className="footer">
        <p>EprinScanner Pro — Lectura simultánea de etiquetas</p>
      </footer>
    </div>
  );
}

export default App;
