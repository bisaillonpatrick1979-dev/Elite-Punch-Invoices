import { useState } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";
import { formatMoney } from "../../utils/money.js";

const defaultForm = {
  name: "",
  role: "employee",
  phone: "",
  email: "",
  defaultHourlyRate: "0",
  defaultSquareFootRate: "0",
  notes: ""
};

export default function Employees() {
  const { appData, updateAppData } = useAppData();
  const [form, setForm] = useState(defaultForm);
  const settings = appData.settings || {};
  const workers = appData.workers || [];

  const updateField = (field, value) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const addWorker = () => {
    const name = form.name.trim();

    if (!name) {
      return;
    }

    const newWorker = {
      id: `worker-${Date.now()}`,
      name,
      role: form.role,
      phone: form.phone.trim(),
      email: form.email.trim(),
      active: true,
      defaultHourlyRate: Number(form.defaultHourlyRate || 0),
      defaultSquareFootRate: Number(form.defaultSquareFootRate || 0),
      notes: form.notes.trim(),
      createdAt: new Date().toISOString()
    };

    updateAppData((currentData) => ({
      ...currentData,
      workers: [newWorker, ...(currentData.workers || [])]
    }));

    setForm(defaultForm);
  };

  const toggleWorker = (workerId) => {
    updateAppData((currentData) => ({
      ...currentData,
      workers: (currentData.workers || []).map((worker) =>
        worker.id === workerId ? { ...worker, active: !worker.active } : worker
      )
    }));
  };

  const updateWorkerRate = (workerId, field, value) => {
    updateAppData((currentData) => ({
      ...currentData,
      workers: (currentData.workers || []).map((worker) =>
        worker.id === workerId ? { ...worker, [field]: Number(value || 0) } : worker
      )
    }));
  };

  return (
    <section className="module-page">
      <div className="hero-card">
        <span className="status-pill">Workers</span>
        <h2>Employees and subcontractors</h2>
        <p>Add workers with default hourly and square-foot rates. Punch can use these defaults later.</p>
      </div>

      <div className="info-card">
        <h2>Add worker</h2>
        <div className="form-grid">
          <label className="field">
            <span>Name</span>
            <input value={form.name} onChange={(event) => updateField("name", event.target.value)} />
          </label>

          <label className="field">
            <span>Role</span>
            <select value={form.role} onChange={(event) => updateField("role", event.target.value)}>
              <option value="employee">Employee</option>
              <option value="subcontractor">Subcontractor</option>
              <option value="owner">Owner</option>
            </select>
          </label>

          <label className="field">
            <span>Phone</span>
            <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
          </label>

          <label className="field">
            <span>Email</span>
            <input value={form.email} onChange={(event) => updateField("email", event.target.value)} />
          </label>

          <label className="field">
            <span>Hourly rate</span>
            <input type="number" min="0" step="0.01" value={form.defaultHourlyRate} onChange={(event) => updateField("defaultHourlyRate", event.target.value)} />
          </label>

          <label className="field">
            <span>Square-foot rate</span>
            <input type="number" min="0" step="0.01" value={form.defaultSquareFootRate} onChange={(event) => updateField("defaultSquareFootRate", event.target.value)} />
          </label>

          <label className="field field-full">
            <span>Notes</span>
            <textarea rows="3" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
          </label>
        </div>

        <div className="action-row">
          <button className="primary-action" type="button" onClick={addWorker}>Add worker</button>
        </div>
      </div>

      <div className="info-card">
        <h2>Worker list</h2>
        {workers.length === 0 ? <p>No worker yet.</p> : (
          <div className="simple-list">
            {workers.map((worker) => (
              <div className="list-item" key={worker.id}>
                <strong>{worker.name}</strong>
                <span>{worker.role || "employee"} | {worker.active ? "Active" : "Inactive"}</span>
                <span>{worker.phone || "No phone"} | {worker.email || "No email"}</span>

                <div className="form-grid">
                  <label className="field">
                    <span>Hourly</span>
                    <input type="number" min="0" step="0.01" value={worker.defaultHourlyRate || 0} onChange={(event) => updateWorkerRate(worker.id, "defaultHourlyRate", event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Sq ft</span>
                    <input type="number" min="0" step="0.01" value={worker.defaultSquareFootRate || 0} onChange={(event) => updateWorkerRate(worker.id, "defaultSquareFootRate", event.target.value)} />
                  </label>
                </div>

                <span>
                  Hourly: {formatMoney(worker.defaultHourlyRate || 0, settings.currency || "CAD", settings.locale || "fr-CA")} | Sq ft: {formatMoney(worker.defaultSquareFootRate || 0, settings.currency || "CAD", settings.locale || "fr-CA")}
                </span>

                <div className="action-row">
                  <button className="secondary-action" type="button" onClick={() => toggleWorker(worker.id)}>{worker.active ? "Deactivate" : "Activate"}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
