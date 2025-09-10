const fs = require('fs');
const path = require('path');

// Proper translations for visual breakdown keys
const translations = {
  'es': {
    "debt_to_asset_ratio": "Relación Deuda-Activos",
    "negative": "Negativo",
    "high_risk": "Alto riesgo",
    "moderate_risk": "Riesgo moderado", 
    "low_risk": "Bajo riesgo",
    "top_assets": "Principales Activos",
    "top_debts": "Principales Deudas"
  },
  'fr': {
    "debt_to_asset_ratio": "Ratio Dette-Actifs",
    "negative": "Négatif",
    "high_risk": "Risque élevé",
    "moderate_risk": "Risque modéré",
    "low_risk": "Faible risque", 
    "top_assets": "Principaux Actifs",
    "top_debts": "Principales Dettes"
  },
  'de': {
    "debt_to_asset_ratio": "Schulden-zu-Vermögens-Verhältnis",
    "negative": "Negativ",
    "high_risk": "Hohes Risiko",
    "moderate_risk": "Mittleres Risiko",
    "low_risk": "Niedriges Risiko",
    "top_assets": "Top-Vermögenswerte", 
    "top_debts": "Top-Schulden"
  },
  'pt': {
    "debt_to_asset_ratio": "Relação Dívida-Ativos",
    "negative": "Negativo",
    "high_risk": "Alto risco",
    "moderate_risk": "Risco moderado",
    "low_risk": "Baixo risco",
    "top_assets": "Principais Ativos",
    "top_debts": "Principais Dívidas"
  },
  'ru': {
    "debt_to_asset_ratio": "Соотношение Долг-Активы",
    "negative": "Отрицательный",
    "high_risk": "Высокий риск",
    "moderate_risk": "Умеренный риск", 
    "low_risk": "Низкий риск",
    "top_assets": "Основные Активы",
    "top_debts": "Основные Долги"
  },
  'ja': {
    "debt_to_asset_ratio": "負債対資産比率",
    "negative": "負",
    "high_risk": "高リスク",
    "moderate_risk": "中リスク",
    "low_risk": "低リスク",
    "top_assets": "主要資産",
    "top_debts": "主要負債"
  },
  'zh': {
    "debt_to_asset_ratio": "债务资产比率",
    "negative": "负",
    "high_risk": "高风险",
    "moderate_risk": "中等风险",
    "low_risk": "低风险", 
    "top_assets": "主要资产",
    "top_debts": "主要债务"
  }
};

// Function to update a language file
function updateLanguageFile(langCode) {
  const filePath = path.join(__dirname, 'src', 'locales', `${langCode}.json`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File ${filePath} does not exist, skipping...`);
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    // Ensure assets_debts section exists
    if (!data.assets_debts) {
      data.assets_debts = {};
    }
    
    // Update keys with proper translations
    if (translations[langCode]) {
      Object.keys(translations[langCode]).forEach(key => {
        data.assets_debts[key] = translations[langCode][key];
      });
    }
    
    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    console.log(`✅ Updated visual breakdown translations in ${langCode}.json`);
    
  } catch (error) {
    console.error(`❌ Error updating ${langCode}.json:`, error.message);
  }
}

// Update all language files
console.log('Updating visual breakdown translations with proper translations...\n');

Object.keys(translations).forEach(langCode => {
  updateLanguageFile(langCode);
});

console.log('\n✅ All visual breakdown translations updated successfully!');
