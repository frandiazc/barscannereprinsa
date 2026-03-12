import { useState, useCallback } from 'react';
import { readBarcodes } from 'zxing-wasm/reader';

export function useBarcodeScanner() {
  const [barcodes, setBarcodes] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);

  const scanImage = useCallback(async (imageElement) => {
    // Only proceed if we have a valid image element with dimensions
    if (!imageElement || (!imageElement.width && !imageElement.videoWidth && !imageElement.naturalWidth)) {
        return [];
    }
  
    setIsScanning(true);
    setError(null);
    setBarcodes([]);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = imageElement.naturalWidth || imageElement.width || imageElement.videoWidth;
      canvas.height = imageElement.naturalHeight || imageElement.height || imageElement.videoHeight;
      
      // Make sure canvas actually generated a size
      if (canvas.width === 0 || canvas.height === 0) {
          setIsScanning(false);
          return [];
      }
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const detectedCodes = await readBarcodes(imageData, {
        tryHarder: true,
        maxNumberOfSymbols: 10,
        formats: ["Code128"]
      });

      if (detectedCodes && detectedCodes.length > 0) {
        const mappedCodes = detectedCodes.map(code => {
          let label = "Desconocido";
          let displayFormat = code.format;
          
          if (code.text.startsWith("ALM")) {
            label = "Código Almacén";
          } else if (code.text.startsWith("SN") || code.text.includes("5CD")) { // Assuming SN format from image might just be the code or start with SN
             label = "SN";
          } else if (!code.text.startsWith("ALM") && !code.text.startsWith("SN") && /^\d+$/.test(code.text)) {
             label = "Epricode";
             // El código vertical parece ser ITF o Code39/128 pero solo números
             // Nos aseguramos de etiquetarlo correctamente.
          } else {
             label = "Epricode"; // Catch all for the small one if logic fails
          }

          return {
            value: code.text,
            format: displayFormat,
            customLabel: label,
            boundingBox: null
          };
        });
        
        // Remove exact duplicates
        const uniqueCodes = Array.from(new Set(mappedCodes.map(a => a.value)))
          .map(value => mappedCodes.find(a => a.value === value));
          
        setBarcodes(uniqueCodes);
        setIsScanning(false);
        return uniqueCodes;
      }

      // No barcodes found
      setIsScanning(false);
      return [];

    } catch (err) {
      console.error("Scanning error:", err);
      setError("Error al procesar la imagen con zxing-wasm. Inténtalo de nuevo.");
      setIsScanning(false);
      return [];
    }
  }, []);

  return {
    barcodes,
    isScanning,
    error,
    scanImage
  };
}
