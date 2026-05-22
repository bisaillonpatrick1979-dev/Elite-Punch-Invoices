import { useState } from "react";

import { useAppData } from "../../context/AppDataContext.jsx";

const defaultForm = {
  name: "",
  phone: "",
  email: "",
  civicAddress: "",
  notes: ""
};

export default function Clients() {
  const { appData, updateAppData } = useAppData();
  const [form, setForm] = useState(defaultForm);
  const clients = appData.clients || [];

  const updateField = (field, value) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const addClient = () => {
    const name = form.name.trim();
    if (!name) return;

    const newClient = {
      id: `client-${Date.now()}`,
      name,
      phone: form.phone.trim(),
      email: form.email.trim(),
      civicAddress: form.civicAddress.trim(),
      notes: form.notes.trim(),
      active: true,
      createdAt: new Date().toISOString()
    };

    updateAppData((currentData) => ({
      ...currentData,
      clients: [newClient, ...(currentData.clients || [])]
    }));

    setForm(defaultForm);
  };

  const toggleClient = (clientId) => {
    updateAppData((currentData) => ({
      ...currentData,
      clients: (currentData.clients || []).map((client) =>
        client.id === clientId ? { ...client, active: !client.active } : client
      )
    }));
  };

  return (
    <section className="module-page">
      <div className="hero-card">
        <span className="status-pill">Clients</span>
        <h2>Clients</h2>
        <p>Create reusable clients for punch, invoices and PDF contact details.</p>
      </div>

      <div className="info-card">
        <h2>Add client</h2>
        <div className="form-grid">
          <label className="field"><span>Name / company</span><input value={form.name} onChange={(event) => updateField("name", event.target.value)} /></label>
          <label className="field"><span>Phone</span><input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} /></label>
          <label className="field"><span>Email</span><input value={form.email} onChange={(event) => updateField("email", event.target.value)} /></label>
          <label className="field field-full"><span>Civic address</span><textarea rows="3" value={form.civicAddress} onChange={(event) => updateField("civicAddress", event.target.value)} /></label>
          <label className="field field-full"><span>Notes</span><textarea rows="3" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} /></label>
        </div>
        <div className="action-row"><button className="primary-action" type="button" onClick={addClient}>Add client</button></div>
      </div>

      <div className="info-card">
        <h2>Client list</h2>
        {clients.length === 0 ? <p>No client yet.</p> : (
          <div className="simple-list">
            {clients.map((client) => (
              <div className="list-item" key={client.id}>
                <strong>{client.name}</strong>
                <span>{client.phone || "No phone"} | {client.email || "No email"}</span>
                <span>{client.civicAddress || "No address"}</span>
                <span>{client.active ? "Active" : "Inactive"}</span>
                <div className="action-row"><button className="secondary-action" type="button" onClick={() => toggleClient(client.id)}>{client.active ? "Deactivate" : "Activate"}</button></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
