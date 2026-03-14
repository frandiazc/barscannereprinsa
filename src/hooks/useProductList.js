import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'scanbot-product-list';

function loadFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveToStorage(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Could not save to localStorage', e);
  }
}

function classifyBarcode(text) {
  if (text.startsWith('ALM')) return 'almacen';
  if (text.startsWith('SN') || text.includes('5CD')) return 'sn';
  if (/^\d+$/.test(text)) return 'epricode';
  // Fallback: try to classify by length or other patterns
  return 'epricode';
}

export function useProductList() {
  const [productList, setProductList] = useState(() => loadFromStorage());
  const [currentProduct, setCurrentProduct] = useState({ almacen: null, sn: null, epricode: null });
  const [lastConfirmedAt, setLastConfirmedAt] = useState(null);

  // Persist to localStorage on change
  useEffect(() => {
    saveToStorage(productList);
  }, [productList]);

  const isProductComplete = useCallback((product) => {
    return product.almacen && product.sn && product.epricode;
  }, []);

  const addBarcode = useCallback((code) => {
    const slot = classifyBarcode(code.value);
    
    setCurrentProduct(prev => {
      // Don't overwrite if slot is already filled with same value
      if (prev[slot] === code.value) return prev;
      
      const updated = { ...prev, [slot]: code.value };
      
      // Check if product is now complete
      if (updated.almacen && updated.sn && updated.epricode) {
        // Auto-confirm: schedule adding to list
        setTimeout(() => {
          const newProduct = {
            almacen: updated.almacen,
            sn: updated.sn,
            epricode: updated.epricode,
            timestamp: new Date().toISOString(),
            id: Date.now()
          };
          
          setProductList(prevList => {
            // Check for duplicate product (all 3 codes match)
            const isDuplicate = prevList.some(
              p => p.almacen === newProduct.almacen && 
                   p.sn === newProduct.sn && 
                   p.epricode === newProduct.epricode
            );
            if (isDuplicate) return prevList;
            return [...prevList, newProduct];
          });
          
          setLastConfirmedAt(Date.now());
          
          // Haptic feedback
          if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
          }
          
          // Reset current product for next scan
          setCurrentProduct({ almacen: null, sn: null, epricode: null });
        }, 300);
      }
      
      return updated;
    });
  }, []);

  const confirmProduct = useCallback(() => {
    setCurrentProduct(prev => {
      // At least one code must be present
      const hasAny = prev.almacen || prev.sn || prev.epricode;
      if (!hasAny) return prev;
      
      const newProduct = {
        almacen: prev.almacen || '—',
        sn: prev.sn || '—',
        epricode: prev.epricode || '—',
        timestamp: new Date().toISOString(),
        id: Date.now()
      };
      
      setProductList(prevList => [...prevList, newProduct]);
      setLastConfirmedAt(Date.now());
      
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      
      return { almacen: null, sn: null, epricode: null };
    });
  }, []);

  const resetCurrentProduct = useCallback(() => {
    setCurrentProduct({ almacen: null, sn: null, epricode: null });
  }, []);

  const removeProduct = useCallback((id) => {
    setProductList(prev => prev.filter(p => p.id !== id));
  }, []);

  const clearList = useCallback(() => {
    setProductList([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const exportCSV = useCallback(() => {
    if (productList.length === 0) return;
    
    const header = 'N°,Almacén,SN,Epricode,Fecha/Hora';
    const rows = productList.map((p, i) => {
      const date = new Date(p.timestamp).toLocaleString('es-ES');
      return `${i + 1},"${p.almacen}","${p.sn}","${p.epricode}","${date}"`;
    });
    
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `escaneo_productos_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [productList]);

  const filledSlots = [currentProduct.almacen, currentProduct.sn, currentProduct.epricode].filter(Boolean).length;

  return {
    currentProduct,
    productList,
    lastConfirmedAt,
    filledSlots,
    isProductComplete: isProductComplete(currentProduct),
    addBarcode,
    confirmProduct,
    resetCurrentProduct,
    removeProduct,
    clearList,
    exportCSV
  };
}
