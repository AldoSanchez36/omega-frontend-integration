"use client"

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

const ScrollArrow: React.FC = () => {
  const [isAtTop, setIsAtTop] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [rightOffset, setRightOffset] = useState(16); // Valor inicial

  useEffect(() => {
    const calculatePosition = () => {
      // Buscar el contenedor principal con max-w-7xl
      const container = document.querySelector('.max-w-7xl');
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const containerRight = containerRect.right;
        const distanceFromRight = viewportWidth - containerRight;
        // Posicionar el botón justo al lado del contenedor (con un pequeño margen) y 65px más a la derecha (15 + 20 + 30)
        setRightOffset(Math.max(16, distanceFromRight + 8 - 65));
      } else {
        // Fallback: si no se encuentra el contenedor, usar un valor fijo más cercano
        setRightOffset(16);
      }
    };

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Determinar si estamos cerca del top (primeros 200px)
      const nearTop = scrollTop < 200;
      setIsAtTop(nearTop);
      
      // Mostrar la flecha solo si hay suficiente contenido para hacer scroll
      const hasScrollableContent = documentHeight > windowHeight + 100;
      setIsVisible(hasScrollableContent);
    };

    // Calcular posición inicial
    calculatePosition();
    handleScroll();

    // Agregar listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', () => {
      calculatePosition();
      handleScroll();
    }, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', calculatePosition);
    };
  }, []);

  const scrollToTarget = () => {
    if (isAtTop) {
      // Ir al final de la página
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
      });
    } else {
      // Ir al inicio de la página
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  if (!isVisible) return null;

  return (
    <Button
      onClick={scrollToTarget}
      style={{ 
        position: 'fixed',
        right: `${rightOffset}px`,
        bottom: '16px',
        zIndex: 50
      }}
      className="h-10 w-10 rounded-full shadow-md bg-blue-600 hover:bg-blue-700 text-white p-0 transition-all duration-200 hover:shadow-lg"
      aria-label={isAtTop ? "Ir al final de la página" : "Ir al inicio de la página"}
    >
      {isAtTop ? (
        <ChevronDown className="h-5 w-5" />
      ) : (
        <ChevronUp className="h-5 w-5" />
      )}
    </Button>
  );
};

export default ScrollArrow;

