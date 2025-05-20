// Example: LanguageSwitcher component
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { t, i18n } = useTranslation(); // Destructure t

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div>
      <button onClick={() => changeLanguage('en')}>English</button>
      <button onClick={() => changeLanguage('es')}>Espanol</button>
      <button onClick={() => changeLanguage('de')}>Deutsch</button>
      <button onClick={() => changeLanguage('ru')}>Pусский</button>
      <button onClick={() => changeLanguage('vi')}>Tiếng Việt</button>
      {/* Add buttons for other languages */}
    </div>
  );
}

export default LanguageSwitcher;
