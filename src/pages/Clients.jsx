import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Plus,
  MapPin,
  Phone,
  Mail,
  Edit,
  Trash2,
  FolderKanban,
  Star,
  Package,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import ProjectQRDisplay from "@/components/clients/ProjectQRDisplay";
import FacilityFeedbackQRDisplay from "@/components/clients/FacilityFeedbackQRDisplay";
import InventoryQRDisplay from "@/components/clients/InventoryQRDisplay";
import EmptyState from "@/components/EmptyState";
import QueryErrorState from "@/components/QueryErrorState";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/lib/toast";
import { reportError } from "@/lib/error-reporting";

const randToken = (prefix) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

export default function Clients() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "admin";
  const tenantId = user?.tenant_id;
  const queryClient = useQueryClient();

  const [showDialog, setShowDialog] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deletingClient, setDeletingClient] = useState(null);
  const [selectedTenantForCreate, setSelectedTenantForCreate] = useState(null);

  const clientsQuery = useQuery({
    queryKey: isSuperAdmin ? ["all-clients"] : ["clients", tenantId],
    queryFn: () =>
      isSuperAdmin
        ? base44.entities.Client.list("-created_date")
        : tenantId
        ? base44.entities.Client.filter({ tenant_id: tenantId }, "-created_date")
        : Promise.resolve([]),
    enabled: isSuperAdmin || !!tenantId,
  });

  const tenantsQuery = useQuery({
    queryKey: ["all-tenants"],
    queryFn: () => base44.entities.Tenant.list(),
    enabled: isSuperAdmin,
  });

  const areasQuery = useQuery({
    queryKey: ["areas", isSuperAdmin ? "all" : tenantId],
    queryFn: () =>
      isSuperAdmin
        ? base44.entities.Area.list()
        : tenantId
        ? base44.entities.Area.filter({ tenant_id: tenantId })
        : Promise.resolve([]),
    enabled: isSuperAdmin || !!tenantId,
  });

  const clients = clientsQuery.data ?? [];
  const allTenants = tenantsQuery.data ?? [];
  const areas = areasQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["all-clients"] });
      setShowDialog(false);
      setEditingClient(null);
      setSelectedTenantForCreate(null);
      toast.success("Client created");
    },
    onError: (error) => {
      reportError(error, { where: "Clients.create" });
      toast.error(`Failed to create client: ${error?.message ?? "Unknown error"}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["all-clients"] });
      setShowDialog(false);
      setEditingClient(null);
      toast.success("Client updated");
    },
    onError: (error) => {
      reportError(error, { where: "Clients.update" });
      toast.error(`Failed to update client: ${error?.message ?? "Unknown error"}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["all-clients"] });
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      setDeletingClient(null);
      toast.success("Client deleted");
    },
    onError: (error) => {
      reportError(error, { where: "Clients.delete" });
      toast.error(`Failed to delete client: ${error?.message ?? "Unknown error"}`);
    },
  });

  // One-shot lazy backfill of missing QR tokens (replaces the old per-render loop)
  const backfillRef = useRef(false);
  useEffect(() => {
    if (backfillRef.current) return;
    if (!clients.length) return;
    const needsBackfill = clients.filter(
      (c) => !c.project_qr_token || !c.feedback_qr_token || !c.inventory_qr_token
    );
    if (needsBackfill.length === 0) return;
    backfillRef.current = true;
    Promise.all(
      needsBackfill.map((c) =>
        base44.entities.Client.update(c.id, {
          project_qr_token: c.project_qr_token ?? randToken("proj"),
          feedback_qr_token: c.feedback_qr_token ?? randToken("fac_fb"),
          inventory_qr_token: c.inventory_qr_token ?? randToken("inv"),
        })
      )
    )
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["clients"] });
        queryClient.invalidateQueries({ queryKey: ["all-clients"] });
      })
      .catch((error) => {
        backfillRef.current = false;
        reportError(error, { where: "Clients.backfillTokens" });
      });
  }, [clients, queryClient]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    let tenant_id;
    if (isSuperAdmin) {
      tenant_id = editingClient?.tenant_id ?? selectedTenantForCreate ?? formData.get("tenant_id");
      if (!tenant_id) {
        toast.error("Please select a tenant for this client");
        return;
      }
    } else {
      if (!tenantId) {
        toast.error("Tenant not found. Please refresh and try again.");
        return;
      }
      tenant_id = tenantId;
    }

    const data = {
      tenant_id,
      name: formData.get("name"),
      code: formData.get("code"),
      address: formData.get("address"),
      contact_name: formData.get("contact_name"),
      contact_email: formData.get("contact_email"),
      contact_phone: formData.get("contact_phone"),
      project_qr_token: editingClient?.project_qr_token ?? randToken("proj"),
      feedback_qr_token: editingClient?.feedback_qr_token ?? randToken("fac_fb"),
      inventory_qr_token: editingClient?.inventory_qr_token ?? randToken("inv"),
    };

    if (editingClient) updateMutation.mutate({ id: editingClient.id, data });
    else createMutation.mutate(data);
  };

  const getAreaCount = (clientId) => areas.filter((a) => a.client_id === clientId).length;
  const getTenantName = (id) =>
    isSuperAdmin ? allTenants.find((t) => t.id === id)?.name ?? "Unknown Tenant" : null;
  const canAddClient = isSuperAdmin || !!tenantId;

  if (clientsQuery.isError) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 max-w-7xl mx-auto">
        <QueryErrorState error={clientsQuery.error} onRetry={() => clientsQuery.refetch()} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Client Locations</h1>
            <p className="text-gray-600">Manage facility locations and contacts</p>
            {isSuperAdmin ? (
              <Badge variant="destructive" className="mt-2">
                Super Admin — All Tenants
              </Badge>
            ) : null}
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={!canAddClient}>
                <Plus className="w-5 h-5 mr-2" aria-hidden="true" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingClient ? "Edit Client" : "Add New Client"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {isSuperAdmin && !editingClient ? (
                  <div>
                    <Label htmlFor="tenant_id">Tenant (Company) *</Label>
                    <Select name="tenant_id" required onValueChange={setSelectedTenantForCreate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tenant" />
                      </SelectTrigger>
                      <SelectContent>
                        {allTenants.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.name} ({tenant.slug})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Client Name *</Label>
                    <Input id="name" name="name" required defaultValue={editingClient?.name} placeholder="e.g., Kellenberg High School" />
                  </div>
                  <div>
                    <Label htmlFor="code">Short Code *</Label>
                    <Input id="code" name="code" required defaultValue={editingClient?.code} placeholder="e.g., KHS" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" name="address" defaultValue={editingClient?.address} placeholder="Full address" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="contact_name">Contact Name</Label>
                    <Input id="contact_name" name="contact_name" defaultValue={editingClient?.contact_name} />
                  </div>
                  <div>
                    <Label htmlFor="contact_email">Email</Label>
                    <Input id="contact_email" name="contact_email" type="email" defaultValue={editingClient?.contact_email} />
                  </div>
                  <div>
                    <Label htmlFor="contact_phone">Phone</Label>
                    <Input id="contact_phone" name="contact_phone" defaultValue={editingClient?.contact_phone} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowDialog(false);
                      setEditingClient(null);
                      setSelectedTenantForCreate(null);
                    }}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Saving…"
                      : editingClient
                      ? "Update Client"
                      : "Create Client"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {clientsQuery.isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No clients yet"
            description="Get started by adding your first client location."
            actionLabel="Add your first client"
            onAction={() => canAddClient && setShowDialog(true)}
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => (
              <Card key={client.id} className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-emerald-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center shadow-md">
                        <Building2 className="w-6 h-6 text-white" aria-hidden="true" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{client.name}</CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {client.code}
                        </Badge>
                        {isSuperAdmin ? (
                          <p className="text-xs text-gray-600 mt-1">{getTenantName(client.tenant_id)}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${client.name}`}
                        onClick={() => {
                          setEditingClient(client);
                          setShowDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${client.name}`}
                        onClick={() => setDeletingClient(client)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {client.address ? (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" aria-hidden="true" />
                      <span className="text-gray-700">{client.address}</span>
                    </div>
                  ) : null}
                  {client.contact_name ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" aria-hidden="true" />
                      <span className="text-gray-700">{client.contact_name}</span>
                    </div>
                  ) : null}
                  {client.contact_email ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" aria-hidden="true" />
                      <span className="text-gray-700">{client.contact_email}</span>
                    </div>
                  ) : null}

                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <FolderKanban className="w-4 h-4 text-blue-600" aria-hidden="true" />
                      Project Submission QR
                    </h4>
                    <ProjectQRDisplay token={client.project_qr_token} clientName={client.name} clientCode={client.code} />
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                      Facility Feedback QR
                    </h4>
                    <FacilityFeedbackQRDisplay token={client.feedback_qr_token} clientName={client.name} clientCode={client.code} />
                    <p className="text-xs text-gray-500 mt-2">
                      For overall facility satisfaction — place at main entrance.
                    </p>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4 text-purple-600" aria-hidden="true" />
                      Inventory Management QR
                    </h4>
                    <InventoryQRDisplay token={client.inventory_qr_token} clientName={client.name} clientCode={client.code} />
                    <p className="text-xs text-gray-500 mt-2">For supply closet — quick access to inventory.</p>
                  </div>

                  <div className="pt-3 border-t mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Areas</span>
                      <span className="font-semibold text-emerald-600">{getAreaCount(client.id)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AlertDialog open={!!deletingClient} onOpenChange={() => setDeletingClient(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete client?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{deletingClient?.name}&quot;? This will also delete all associated areas, cleaning events, and records. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingClient && deleteMutation.mutate(deletingClient.id)}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete Client"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
