const fs = require('fs');
const path = require('path');

const translations = {
  es: "Ver Planes y Precios",
  fr: "Voir les Plans et Tarifs",
  de: "Pläne und Preise Anzeigen",
  pt: "Ver Planos e Preços",
  ru: "Посмотреть Планы и Цены",
  zh: "查看计划和定价",
  hi: "योजनाएं और मूल्य देखें",
  ar: "عرض الخطط والأسعار",
  ja: "プランと価格を見る"
};

const languages = ['es', 'fr', 'de', 'pt', 'ru', 'zh', 'hi', 'ar', 'ja'];

languages.forEach(lang => {
  const filePath = path.join(__dirname, 'src', 'locales', `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // Add see_plans_pricing to settings section
  if (data.settings) {
    data.settings.see_plans_pricing = translations[lang];
  }
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Added see_plans_pricing translation to ${lang}.json`);
});

console.log('See Plans & Pricing translation added to all language files!');
