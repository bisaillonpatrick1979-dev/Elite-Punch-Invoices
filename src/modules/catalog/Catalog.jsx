import { useState } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import { formatMoney } from "../../utils/money.js";

const defaultForm = {
  name: "",
  category: "material",
  unit: "unit",
  defaultPrice: "0",
  taxable: "true"
};

const units = ["hour", "sq ft", "linear ft", "unit", "box", "roll", "fixed"];

export default function Catalog() {
  const { appData, updateAppData } = useAppData();
  const [form, setForm] = useState(defaultForm);
  const settings = appData.settings || {};
  const items = appData.catalogItems || [];

  const updateField = (field, value) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const addItem = () => {
    const name = form.name.trim();

    if (!name) {
      return;
    }

    const newItem = {
      id: `catalog-${Date.now()}`,
      name,
      category: form.category,
      unit: form.unit,
      defaultPrice: Number(form.defaultPrice || 0),
      taxable: form.taxable === "true",
      active: true,
      createdAt: new Date().toISOString()
    };

    updateAppData((currentData) => ({
      ...currentData,
      catalogItems: [newItem, ...(currentData.catalogItems || [])]
    }));

    setForm(defaultForm);
  };

  const toggleItem = (itemId) => {
    updateAppData((currentData) => ({
      ...currentData,
      catalogItems: (currentData.catalogItems || []).map((item) =>
        item.id === itemId ? { ...item, active: !item.active } : item
      )
    }));
  };

  return (
    <section className="module-page">
      <div className="hero-card">
        <span className="status-pill">Catalog</span>
        <h2>Materials and extras</h2>
        <p>Create reusable billable items for invoices: materials, services, tools, extras and fixed charges.</p>
      </div>

      <div className="info-card">
        <h2>Add item</h2>
        <div className="form-grid">
          <label className="field">
            <span>Name</span>
            <input value={form.name} onChange={(event) => updateField("name", event.target.value)} />
          </label>

          <label className="field">
            <span>Category</span>
            <select value={form.category} onChange={(event) => updateField("category", event.target.value)}>
              <option value="material">Material</option>
              <option value="service">Service</option>
              <option value="extra">Extra</option>
              <option value="rental">Tool rental</option>
              <option value="fee">Fee</option>
            </select>
          </label>

          <label className="field">
            <span>Unit</span>
            <select value={form.unit} onChange={(event) => updateField("unit", event.target.value)}>
              {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
          </label>

          <label className="field">
            <span>Default price</span>
            <input type="number" min="0" step="0.01" value={form.defaultPrice} onChange={(event) => updateField("defaultPrice", event.target.value)} />
          </label>

          <label className="field">
            <span>Taxable</span>
            <select value={form.taxable} onChange={(event) => updateField("taxable", event.target.value)}>
              <option value="true">Taxable</option>
              <option value="false">Not taxable</option>
            </select>
          </label>
        </div>

        <div className="action-row">
          <button className="primary-action" type="button" onClick={addItem}>Add catalog item</button>
        </div>
      </div>

      <div className="info-card">
        <h2>Catalog items</h2>
        {items.length === 0 ? <p>No item yet.</p> : (
          <div className="simple-list">
            {items.map((item) => (
              <div className="list-item" key={item.id}>
                <strong>{item.name}</strong>
                <span>{item.category} | {item.unit} | {formatMoney(item.defaultPrice || 0, settings.currency || "CAD", settings.locale || "fr-CA")}</span>
                <span>{item.taxable ? "Taxable" : "Not taxable"} | {item.active ? "Active" : "Inactive"}</span>
                <div className="action-row">
                  <button className="secondary-action" type="button" onClick={() => toggleItem(item.id)}>{item.active ? "Deactivate" : "Activate"}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
