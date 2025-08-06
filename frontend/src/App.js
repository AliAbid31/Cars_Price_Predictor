import React, { useState, useEffect } from 'react';
import { 
  brandsAndModels, carTypes, colors, 
  fuelTypes, gearboxTypes, papersOptions 
} from './carData';
import './App.css';

function App() {
  const [formData, setFormData] = useState({
    'Brand': '',
    'Model': '',
    'Ext Color': 'Noir',
    'Car Type': '',
    'Boot Size': '',
    'Papers': 'ok',
    'Kilometres counter': '',
    'Matricule Year': '',
    'Motorisation': 'Essence',
    'Motor Power': '',
    'Gearbox type': 'Manuelle',
  });
  const API_BASE_URL = process.env.REACT_APP_API_URL || '';
  
  const [availableModels, setAvailableModels] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // --- LOGIQUE D'AUTOMATISATION ---

  // Règle 1 : Mettre à jour automatiquement le type de voiture
  useEffect(() => {
    if (formData.Brand && formData.Model) {
      const modelsForBrand = brandsAndModels[formData.Brand] || [];
      const selectedModel = modelsForBrand.find(m => m.name === formData.Model);
      if (selectedModel && selectedModel.type && selectedModel.type !== formData['Car Type']) {
        setFormData(prevData => ({ ...prevData, 'Car Type': selectedModel.type }));
      }
    }
  }, [formData.Brand, formData.Model]);

  // Règle 2 : Mettre à jour automatiquement les papiers en fonction de l'âge
  useEffect(() => {
    if (formData['Matricule Year']) {
      const age = new Date().getFullYear() - formData['Matricule Year'];
      if (age > 5) {
        setFormData(prevData => ({ ...prevData, 'Papers': 'ok' }));
      }
    }
  }, [formData['Matricule Year']]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Correction de la faute de frappe ici
    const isNumeric = ['Boot Size', 'Kilometres counter', 'Matricule Year', 'Motor Power'].includes(name);
    const updatedValue = isNumeric ? (value === '' ? '' : parseFloat(value)) : value;

    const newFormData = { ...formData, [name]: updatedValue };

    if (name === 'Brand') {
      const newModels = brandsAndModels[value] || [];
      setAvailableModels(newModels);
      newFormData.Model = '';
      newFormData['Car Type'] = '';
    }

    setFormData(newFormData);
  };

  // Fonction handleSubmit complète
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setPrediction(null);

    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Erreur serveur.');
      }
      setPrediction(result.predicted_price);
    } catch (err) {
      setError(`Impossible de contacter le serveur. Est-il lancé ? Détails: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const age = formData['Matricule Year'] ? new Date().getFullYear() - formData['Matricule Year'] : 0;
  const isCarTypeLocked = !!(formData.Brand && formData.Model && (brandsAndModels[formData.Brand] || []).find(m => m.name === formData.Model));
  const isPapersLocked = age > 5;

  return (
    <div className="app-container">
      <div className="form-container">
        <h1 style={{ color: 'green' }}>Estimez le Prix d'une Voiture 🚘 En Algérie</h1>
        <form onSubmit={handleSubmit}>
          
          <div className="form-group">
            <label>Marque :</label>
            <select name="Brand" value={formData.Brand} onChange={handleChange} required>
              <option value="">-- Choisissez une marque --</option>
              {Object.keys(brandsAndModels).map(brand => <option key={brand} value={brand}>{brand}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Modéle :</label>
            <input list="models-list" name="Model" value={formData.Model} onChange={handleChange} required disabled={!formData.Brand} />
            <datalist id="models-list">
              {availableModels.map(model => <option key={model.name} value={model.name} />)}
            </datalist>
          </div>
          
          <div className="form-group">
            <label>Type de Voiture :</label>
            <select name="Car Type" value={formData['Car Type']} onChange={handleChange} required disabled={isCarTypeLocked}>
              <option value="">-- Choisissez un type --</option>
              {carTypes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-group"><label>Couleur éxterieur :</label><input list="colors-list" name="Ext Color" value={formData['Ext Color']} onChange={handleChange} required /><datalist id="colors-list">{colors.map(c => <option key={c} value={c} />)}</datalist></div>
          <div className="form-group"><label>Motorisation :</label><select name="Motorisation" value={formData.Motorisation} onChange={handleChange} required>{fuelTypes.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
          <div className="form-group">
          <label>Boite de vitesse :</label>
          <select 
            // On garde "Gearbox Type" avec un T majuscule
            name="Gearbox type" 
            
            // On lit la MÊME clé dans l'état, avec un T majuscule
            value={formData['Gearbox type']} 
            
            onChange={handleChange} 
            required
          >
            {gearboxTypes.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
          
          <div className="form-group">
          <label>Papers :</label>
          <select name="Papers" value={formData.Papers} onChange={handleChange} required disabled={isPapersLocked}>
            {/* On mappe sur notre tableau d'objets maintenant */}
            {papersOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          </div>

          <div className="form-group"><label>Année de Matriculation :</label><input type="number" name="Matricule Year" value={formData['Matricule Year']} onChange={handleChange} required /></div>
          {/* Correction de la faute de frappe dans le 'name' et le 'label' ici */}
          <div className="form-group"><label>Compteur (Km) :</label><input type="number" name="Kilometres counter" value={formData['Kilometres counter']} onChange={handleChange} required /></div>
          <div className="form-group"><label>Puissance moteur (ch) :</label><input type="number" name="Motor Power" value={formData['Motor Power']} onChange={handleChange} required /></div>
          <div className="form-group"><label>Volume du coffre (Litres) :</label><input type="number" name="Boot Size" value={formData['Boot Size']} onChange={handleChange} required /></div>

          <button type="submit" disabled={isLoading} style={{ backgroundColor: isLoading ? 'green' : 'red'}}>
            {isLoading ? 'Calcul en cours...' : 'Prédire le Prix'}
          </button>
        </form>
        <div className="result-container">
          {prediction !== null && <p className="prediction-success">Prix Estimé : {Math.round(prediction).toLocaleString('fr-FR')} DA</p>}
          {error && <p className="prediction-error">Erreur : {error}</p>}
        </div>
      </div>
    </div>
  );
}
export default App;
