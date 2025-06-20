import React, { useState } from 'react';
import { useLanguage } from '../Elements/LanguageContext';
import { useUser } from '../../context/UserContext';
import '../styles/Element.css'; // Updated import path

export const Elements = ({ showLanguageSelector = false }) => {
  const { changeLanguage, translations } = useLanguage();
  const { userInfo, logout } = useUser();
  const [textEn, setTextEn] = useState('Inglés');
  const [textEs, setTextEs] = useState('Español');
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLanguageChange = (event) => {
    const selectedLanguage = event.target.value;
    changeLanguage(selectedLanguage);

    if (selectedLanguage === 'en') {
      setTextEn('English');
      setTextEs('Spanish');
    } else {
      setTextEn('Inglés');
      setTextEs('Español');
    }
  };

  const handleOptionClick = (option) => {
    if (option === 'logout') {
      logout();
      window.location.href = '/login';
    } else if (option === 'profile') {
      window.location.href = '/profile';
    } else if (option === 'setup') {
      window.location.href = '/setup';
    }
  };

  return (
    <div className="ribbon">
      {showLanguageSelector && (
        <div className="elements-container">
          <span className="material-symbols-outlined">language</span>
          <select className="language-select" onChange={handleLanguageChange}>
            <option value="en">{textEn}</option>
            <option value="es">{textEs}</option>
          </select>
        </div>
      )}

      {/* Buttons depending on role */}
      {userInfo.role === 'client' && (
        <>
          <button className="ribbon-button" onClick={() => window.location.href = '/home'}>{translations.home}</button>
          <button className="ribbon-button" onClick={() => window.location.href = '/reports'}>Report Manager</button>
        </>
      )}
      {userInfo.role === 'admin' && (
        <>
          <button className="ribbon-button" onClick={() => window.location.href = '/home'}>{translations.home}</button>
          <button className="ribbon-button" onClick={() => window.location.href = '/layouts'}>Report Manager</button>
          <button className="ribbon-button" onClick={() => window.location.href = '/agregar-formula'}>Formula Manager</button>
          <button className="ribbon-button" onClick={() => window.location.href = '/param_manager'}>{translations.parameterManager}</button>
          <button className="ribbon-button" onClick={() => window.location.href = '/usersmanagement'}>{translations.usersManagement}</button>
        </>
      )}
      {userInfo.role === 'user' && (
        <>
          <button className="ribbon-button" onClick={() => window.location.href = '/home'}>{translations.home}</button>
          <button className="ribbon-button" onClick={() => window.location.href = '/layouts'}>Report Manager</button>
        </>
      )}

      <div className="profile-container">
        <button 
          className="profile-circle" 
          onClick={() => setShowDropdown(!showDropdown)}
          title="Profile"
        >
          👤
        </button>

        {showDropdown && (
          <div className="profile-dropdown">
            <button onClick={() => handleOptionClick("setup")}>Settings</button>
            <button onClick={() => handleOptionClick("profile")}>My Profile</button>
            <button onClick={() => handleOptionClick("logout")}>Logout</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Elements;
