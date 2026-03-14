import { useState, useCallback, useRef, useEffect } from 'react';
import ScanbotSDK from 'scanbot-web-sdk';

export function useBarcodeScanner() {
  const [barcodes, setBarcodes] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [isSdkReady, setIsSdkReady] = useState(false);
  
  const sdkRef = useRef(null);
  const scannerRef = useRef(null);

  // Initialize SDK
  useEffect(() => {
    const initSdk = async () => {
      try {
        const sdk = await ScanbotSDK.initialize({
          licenseKey: import.meta.env.VITE_SCANBOT_LICENSE_KEY || '',
          enginePath: 'scanbot-web-sdk/', // Match the folder we copy to via Vite config
        });
        sdkRef.current = sdk;
        setIsSdkReady(true);
      } catch (err) {
        console.error("ScanbotSDK Init Error:", err);
        setError("Error inicializando Scanbot: " + err.message);
      }
    };
    
    initSdk();
    
    return () => {
      // Cleanup
      if (scannerRef.current) {
        scannerRef.current.dispose();
      }
    }
  }, []);

  const clearBarcodes = useCallback(() => {
    setBarcodes([]);
    setError(null);
  }, []);

  const mapScanbotCodes = (detectedCodes) => {
    return detectedCodes.map(code => {
      let label = "Desconocido";
      let displayFormat = code.barcodeFormat || code.format || code.type; 
      const text = code.text;
      
      if (text.startsWith("ALM")) {
        label = "Código Almacén";
      } else if (text.startsWith("SN") || text.includes("5CD")) {
         label = "SN";
      } else if (!text.startsWith("ALM") && !text.startsWith("SN") && /^\d+$/.test(text)) {
         label = "Epricode";
      } else {
         label = "Epricode";
      }

      return {
        value: text,
        format: displayFormat,
        customLabel: label,
        boundingBox: code.polygon || null
      };
    });
  }

  const scanImage = useCallback(async (imageElement) => {
    if (!isSdkReady || !sdkRef.current) return [];
    
    setIsScanning(true);
    setError(null);
    setBarcodes([]);

    try {
      // Create a canvas from the image to use as data source if it's an Image element
      const canvas = document.createElement('canvas');
      canvas.width = imageElement.naturalWidth || imageElement.width || 1024;
      canvas.height = imageElement.naturalHeight || imageElement.height || 1024;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');

      // v8.x API for static image detection
      const result = await sdkRef.current.detectBarcodes(dataUrl);
      
      if (result && result.barcodes && result.barcodes.length > 0) {
        const mappedCodes = mapScanbotCodes(result.barcodes);
        setBarcodes(mappedCodes);
        setIsScanning(false);
        return mappedCodes;
      }

      // No barcodes
      setIsScanning(false);
      return [];
    } catch (err) {
      console.error("Scanbot Image Scanning Error Details:", err);
      // Extraemos el mensaje de la excepción para dárselo a la interfaz
      const errorMsg = err?.message || err?.name || JSON.stringify(err);
      setError(`Error al procesar la imagen con Scanbot: ${errorMsg}`);
      setIsScanning(false);
      return [];
    }
  }, [isSdkReady]);

  const startLiveScanner = useCallback(async (containerId) => {
    if (!isSdkReady || !sdkRef.current) return false;
    
    setError(null);
    clearBarcodes();
    
    try {
      if (scannerRef.current) {
        scannerRef.current.dispose();
      }

      // v8.x API for UI scanner
      const configuration = new ScanbotSDK.UI.Config.BarcodeScannerScreenConfiguration();
      configuration.containerId = containerId;
      configuration.returnBarcodeImage = false;
      
      // Override the callback for handling results
      configuration.onBarcodesDetected = (result) => {
        if (result && result.barcodes && result.barcodes.length > 0) {
           setBarcodes(prev => {
              const mappedCodes = mapScanbotCodes(result.barcodes);
              const combined = [...prev, ...mappedCodes];
              // De-duplicate by value
              return Array.from(new Set(combined.map(a => a.value)))
                .map(value => combined.find(a => a.value === value));
            });
        }
      };
      
      configuration.onError = (err) => {
        console.error("Scanner error:", err);
        setError("Error del scanner: " + err.name);
      };

      scannerRef.current = await ScanbotSDK.UI.createBarcodeScanner(configuration);
      return true;
    } catch (err) {
      console.error("Scanbot Camera Init Error Details:", err);
      const errorMsg = err?.message || err?.name || JSON.stringify(err);
      setError(`No se pudo iniciar la cámara: ${errorMsg}`);
      return false;
    }
  }, [clearBarcodes, isSdkReady]);
  
  const stopLiveScanner = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.dispose();
      scannerRef.current = null;
    }
  }, []);

  return {
    barcodes,
    isScanning,
    error,
    isSdkReady,
    scanImage,
    startLiveScanner,
    stopLiveScanner,
    clearBarcodes
  };
}
