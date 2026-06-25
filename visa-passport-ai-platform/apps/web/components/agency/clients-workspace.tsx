"use client";

import type { AgencyClientSummary, AgencyClientsResponse } from "@visa-platform/types";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { Icon } from "@/components/shared/icon";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiErrorMessage, apiRequest } from "@/lib/api";
import { formatDate, initials } from "@/lib/utils";

type ClientFormState = {
  id?: string;
  fullName: string;
  email: string;
  phone: string;
  notes: string;
};

const emptyClientForm: ClientFormState = {
  fullName: "",
  email: "",
  phone: "",
  notes: "",
};

export function AgencyClientsWorkspace() {
  const [clients, setClients] = useState<AgencyClientSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<ClientFormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    try {
      const response = await apiRequest<AgencyClientsResponse>("/api/agency/clients");
      setClients(response.clients);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to load agency clients."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const stats = useMemo(() => ({
    total: clients.length,
    activeCases: clients.reduce((sum, client) => sum + client.activeCases, 0),
    passportJobs: clients.reduce((sum, client) => sum + client.passportJobs, 0),
  }), [clients]);

  function openCreateForm() {
    setFormError(null);
    setForm(emptyClientForm);
  }

  function openEditForm(client: AgencyClientSummary) {
    setFormError(null);
    setForm({
      id: client.id,
      fullName: client.fullName,
      email: client.email ?? "",
      phone: client.phone ?? "",
      notes: client.notes ?? "",
    });
  }

  async function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;

    setIsSaving(true);
    setFormError(null);
    try {
      const body = {
        fullName: form.fullName,
        email: form.email.trim() ? form.email.trim() : null,
        phone: form.phone.trim() ? form.phone.trim() : null,
        notes: form.notes.trim() ? form.notes.trim() : null,
      };
      await apiRequest(form.id ? `/api/agency/clients/${form.id}` : "/api/agency/clients", {
        method: form.id ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      setForm(null);
      await loadClients();
    } catch (requestError) {
      setFormError(apiErrorMessage(requestError, "Unable to save this client."));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteClient(client: AgencyClientSummary) {
    if (!window.confirm(`Delete ${client.fullName}? Existing cases will keep their history.`)) return;
    try {
      await apiRequest(`/api/agency/clients/${client.id}`, { method: "DELETE" });
      await loadClients();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to delete this client."));
    }
  }

  return <>
    <PageHeader
      eyebrow="Customer management"
      title="Clients"
      description="Manage traveler profiles, shared documents, and active case access."
      actions={<Button onClick={openCreateForm}><Icon name="plus" /> Add client</Button>}
    />
    {error && <div className="passport-error-alert" role="alert"><span><Icon name="shield" /></span><div><strong>Client request failed</strong><p>{error}</p></div><button onClick={() => setError(null)} aria-label="Dismiss error">x</button></div>}
    <div className="stats-grid stats-grid-three">
      <StatCard label="Total clients" value={String(stats.total)} detail="Authorized client records" icon="users" tone="cyan" />
      <StatCard label="Active cases" value={String(stats.activeCases)} detail="Linked visa applications" icon="file" />
      <StatCard label="Passport jobs" value={String(stats.passportJobs)} detail="Client-linked extractions" icon="passport" tone="amber" />
    </div>
    <SectionCard title="Client directory" subtitle="Authorized client records in your workspace">
      {isLoading ? <div className="table-empty-state" role="status">Loading clients...</div> : clients.length === 0 ? <div className="table-empty-state"><Icon name="users" /><strong>No clients yet</strong><span>Add your first client to create agency cases.</span><Button size="sm" onClick={openCreateForm}>Add client</Button></div> : <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Client</th><th>Passports</th><th>Active cases</th><th>Last updated</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{clients.map((client) => <tr key={client.id}><td><div className="identity-cell"><span className="table-avatar">{initials(client.fullName)}</span><span><strong>{client.fullName}</strong><small>{client.email ?? "No email"} · {client.id}</small></span></div></td><td>{client.passportJobs}</td><td>{client.activeCases}</td><td>{formatDate(client.updatedAt)}</td><td><Badge tone={client.activeCases > 0 ? "success" : "neutral"}>{client.activeCases > 0 ? "Active" : "Ready"}</Badge></td><td><button className="table-action" aria-label={`Edit ${client.fullName}`} onClick={() => openEditForm(client)}><Icon name="settings" /></button><button className="table-action" aria-label={`Delete ${client.fullName}`} onClick={() => deleteClient(client)}><Icon name="trash" /></button></td></tr>)}</tbody></table></div>}
    </SectionCard>
    {form && <div className="application-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setForm(null); }}><div className="application-modal" role="dialog" aria-modal="true" aria-labelledby="client-form-title"><div className="application-modal-heading"><div><small>{form.id ? "Edit client" : "New client"}</small><h2 id="client-form-title">{form.id ? "Update client" : "Add client"}</h2><p>Client records are scoped to your agency workspace.</p></div><button type="button" onClick={() => setForm(null)} aria-label="Close">x</button></div><form onSubmit={saveClient} aria-busy={isSaving}>{formError && <div className="auth-error" role="alert">{formError}</div>}<label>Full name<Input value={form.fullName} onChange={(event) => setForm((current) => current ? { ...current, fullName: event.target.value } : current)} minLength={2} maxLength={200} required disabled={isSaving} /></label><label>Email<Input type="email" value={form.email} onChange={(event) => setForm((current) => current ? { ...current, email: event.target.value } : current)} maxLength={320} disabled={isSaving} /></label><label>Phone<Input value={form.phone} onChange={(event) => setForm((current) => current ? { ...current, phone: event.target.value } : current)} maxLength={32} disabled={isSaving} /></label><label>Notes<Input value={form.notes} onChange={(event) => setForm((current) => current ? { ...current, notes: event.target.value } : current)} maxLength={2000} disabled={isSaving} /></label><div className="application-modal-actions"><Button type="button" variant="outline" onClick={() => setForm(null)} disabled={isSaving}>Cancel</Button><Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save client"}</Button></div></form></div></div>}
  </>;
}
