import React from "react";
import { useLanguage } from "@/context/LanguageContext";

interface SelectLanguageProps {
  style?: React.CSSProperties;
  width?: string | number;
  variant?: "default" | "menu";
}

const SelectLanguage: React.FC<SelectLanguageProps> = ({ style, width, variant = "default" }) => {
  const { language, changeLanguage } = useLanguage();
  const menuStyle = {
    display: "flex",
    ...style,
  };
  const defaultStyle = {
    display: "flex",
    justifyContent: "flex-end",
    width: width ?? "70px",
    position: "relative" as const,
    left: width ? undefined : "250px",
    ...style,
  };
  return (
    <div style={variant === "menu" ? menuStyle : defaultStyle}>
      {variant === "menu" && (
         <span className="material-icons me-2 align-middle"> language</span>
      )}
      
      <select
        onChange={e => changeLanguage(e.target.value as "en" | "es")}
        value={language}
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: variant === "menu" ? "15px" : "14px",
          fontWeight: variant === "menu" ? 500 : undefined,
          outline: "none",
        }}
      >
        <option value="en">En</option>
        <option value="es">Es</option>
      </select>
      </div>
  );
};

export default SelectLanguage;