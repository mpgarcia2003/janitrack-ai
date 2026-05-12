
import { useState, useEffect } from "react";
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
  Package // ADDED: Package icon for inventory
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogTrigger } from "@radix-ui/react-dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProjectQRDisplay from "../components/clients/ProjectQRDisplay";
import FacilityFeedbackQRDisplay from "../components/clients/FacilityFeedbackQRDisplay";
import InventoryQRDisplay from "../components/clients/InventoryQRDisplay"; // ADDED: New component import
import AuthGuard from "../components/AuthGuard";

export default function Clients() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deletingClient, setDeletingClient] = useState(null);
  const [selectedTenantForCreate, setSelectedTenantForCreate] = useState(null);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isSuperAdmin = user?.role === 'admin';

  // For super admin - fetch ALL clients and tenants
  const { data: allClients = [], isLoading: allClientsLoading } = useQuery({
    queryKey: ['all-clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
    enabled: isSuperAdmin,
  });

  const { data: allTenants = [] } = useQuery({
    queryKey: ['all-tenants'],
    queryFn: () => base44.entities.Tenant.list(),
    enabled: isSuperAdmin,
  });

  // For regular users - fetch only their tenant's clients
  const { data: myClients = [], isLoading: myClientsLoading } = useQuery({
    queryKey: ['clients', user?.tenant_id],
    queryFn: () => user?.tenant_id
      ? base44.entities.Client.filter({ tenant_id: user.tenant_id }, '-created_date')
      : Promise.resolve([]),
    enabled: !!user?.tenant_id && !isSuperAdmin,
  });

  const clients = isSuperAdmin ? allClients : myClients;
  const isLoading = isSuperAdmin ? allClientsLoading : myClientsLoading;

  const { data: areas = [] } = useQuery({
    queryKey: ['areas', user?.tenant_id],
    queryFn: () => {
      if (isSuperAdmin) {
        return base44.entities.Area.list();
      }
      return user?.tenant_id
        ? base44.entities.Area.filter({ tenant_id: user.tenant_id })
        : Promise.resolve([]);
    },
    enabled: isSuperAdmin || !!user?.tenant_id,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      console.log('Creating client with data:', data);
      return await base44.entities.Client.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['all-clients'] });
      setShowDialog(false);
      setEditingClient(null);
      setSelectedTenantForCreate(null);
      alert('Client created successfully!');
    },
    onError: (error) => {
      console.error('Client creation error:', error);
      alert(`Failed to create client: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['all-clients'] });
      setShowDialog(false);
      setEditingClient(null);
      alert('Client updated successfully!');
    },
    onError: (error) => {
      console.error('Client update error:', error);
      alert(`Failed to update client: ${error.message}`);
    }
  });

  useEffect(() => {
    if (clients.length > 0) {
      clients.forEach(client => {
        let needsUpdate = false;
        const updates = {};

        // Generate project_qr_token if missing
        if (!client.project_qr_token) {
          console.log(`Generating project QR token for client "${client.name}" (ID: ${client.id})`);
          updates.project_qr_token = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          needsUpdate = true;
        }

        // Generate feedback_qr_token if missing
        if (!client.feedback_qr_token) {
          console.log(`Generating facility feedback QR token for client "${client.name}" (ID: ${client.id})`);
          updates.feedback_qr_token = `fac_fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          needsUpdate = true;
        }

        // Generate inventory_qr_token if missing
        if (!client.inventory_qr_token) {
          console.log(`Generating inventory QR token for client "${client.name}" (ID: ${client.id})`);
          updates.inventory_qr_token = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          needsUpdate = true;
        }

        if (needsUpdate) {
          updateMutation.mutate({ id: client.id, data: updates });
        }
      });
    }
  }, [clients.length, updateMutation]); // Add updateMutation to dependency array

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['all-clients'] });
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      setDeletingClient(null);
      alert('Client deleted successfully!');
    },
    onError: (error) => {
      console.error('Client deletion error:', error);
      alert(`Failed to delete client: ${error.message}`);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    // Determine tenant_id
    let tenantId;
    if (isSuperAdmin) {
      tenantId = editingClient?.tenant_id || formData.get('tenant_id') || selectedTenantForCreate;
      if (!tenantId) {
        alert('Please select a tenant for this client');
        return;
      }
    } else {
      if (!user?.tenant_id) {
        alert('User tenant not found. Please refresh and try again.');
        return;
      }
      tenantId = user.tenant_id;
    }

    const data = {
      tenant_id: tenantId,
      name: formData.get('name'),
      code: formData.get('code'),
      address: formData.get('address'),
      contact_name: formData.get('contact_name'),
      contact_email: formData.get('contact_email'),
      contact_phone: formData.get('contact_phone'),
      project_qr_token: editingClient?.project_qr_token || `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      feedback_qr_token: editingClient?.feedback_qr_token || `fac_fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      inventory_qr_token: editingClient?.inventory_qr_token || `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // ADDED: Inventory QR token generation
    };

    console.log('Submitting client:', data);

    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getAreaCount = (clientId) => areas.filter(a => a.client_id === clientId).length;

  const getTenantName = (tenantId) => {
    if (!isSuperAdmin) return null;
    return allTenants.find(t => t.id === tenantId)?.name || 'Unknown Tenant';
  };

  // Super admin or user with tenant_id can add clients
  const canAddClient = isSuperAdmin || !!user?.tenant_id;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Client Locations
              </h1>
              <p className="text-gray-600">Manage facility locations and contacts</p>
              {user && (
                <p className="text-xs text-gray-500 mt-1">
                  {isSuperAdmin ? (
                    <Badge variant="destructive">Super Admin - All Tenants</Badge>
                  ) : (
                    <>Tenant ID: {user.tenant_id} | Role: {user.user_role}</>
                  )}
                </p>
              )}
            </div>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700" 
                  disabled={!canAddClient}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Client
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingClient ? 'Edit Client' : 'Add New Client'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {isSuperAdmin && !editingClient && (
                    <div>
                      <Label htmlFor="tenant_id">Tenant (Company) *</Label>
                      <Select
                        name="tenant_id"
                        required
                        onValueChange={setSelectedTenantForCreate}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select tenant" />
                        </SelectTrigger>
                        <SelectContent>
                          {allTenants.map(tenant => (
                            <SelectItem key={tenant.id} value={tenant.id}>
                              {tenant.name} ({tenant.slug})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Client Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        required
                        defaultValue={editingClient?.name}
                        placeholder="e.g., Kellenberg High School"
                      />
                    </div>
                    <div>
                      <Label htmlFor="code">Short Code *</Label>
                      <Input
                        id="code"
                        name="code"
                        required
                        defaultValue={editingClient?.code}
                        placeholder="e.g., KHS"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      name="address"
                      defaultValue={editingClient?.address}
                      placeholder="Full address"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="contact_name">Contact Name</Label>
                      <Input
                        id="contact_name"
                        name="contact_name"
                        defaultValue={editingClient?.contact_name}
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact_email">Email</Label>
                      <Input
                        id="contact_email"
                        name="contact_email"
                        type="email"
                        defaultValue={editingClient?.contact_email}
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact_phone">Phone</Label>
                      <Input
                        id="contact_phone"
                        name="contact_phone"
                        defaultValue={editingClient?.contact_phone}
                      />
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
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {createMutation.isPending || updateMutation.isPending 
                        ? 'Saving...' 
                        : editingClient ? 'Update' : 'Create'
                      } Client
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(i => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          ) : clients.length === 0 ? (
            <Card className="shadow-md">
              <CardContent className="py-12 text-center">
                <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Clients Yet</h3>
                <p className="text-gray-600 mb-4">Get started by adding your first client location</p>
                <Button
                  onClick={() => setShowDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={!canAddClient}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Client
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clients.map(client => (
                <Card
                  key={client.id}
                  className="shadow-md hover:shadow-lg transition-shadow"
                >
                  <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-blue-100">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
                          <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{client.name}</CardTitle>
                          <Badge variant="secondary" className="mt-1">
                            {client.code}
                          </Badge>
                          {isSuperAdmin && (
                            <p className="text-xs text-gray-600 mt-1">
                              {getTenantName(client.tenant_id)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingClient(client);
                            setShowDialog(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingClient(client)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {client.address && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span className="text-gray-700">{client.address}</span>
                      </div>
                    )}
                    {client.contact_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">{client.contact_name}</span>
                      </div>
                    )}
                    {client.contact_email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">{client.contact_email}</span>
                      </div>
                    )}

                    {/* Project Submission QR */}
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <FolderKanban className="w-4 h-4 text-blue-600" />
                        Project Submission QR
                      </h4>
                      <ProjectQRDisplay
                        token={client.project_qr_token}
                        clientName={client.name}
                        clientCode={client.code}
                      />
                    </div>

                    {/* Facility-Wide Feedback QR */}
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Star className="w-4 h-4 text-green-600" />
                        Facility Feedback QR
                      </h4>
                      <FacilityFeedbackQRDisplay
                        token={client.feedback_qr_token}
                        clientName={client.name}
                        clientCode={client.code}
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        For overall facility satisfaction - place at main entrance
                      </p>
                    </div>

                    {/* NEW: Inventory Management QR */}
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4 text-purple-600" />
                        Inventory Management QR
                      </h4>
                      <InventoryQRDisplay
                        token={client.inventory_qr_token}
                        clientName={client.name}
                        clientCode={client.code}
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        For supply closet - quick access to inventory
                      </p>
                    </div>

                    <div className="pt-3 border-t mt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Areas</span>
                        <span className="font-semibold text-blue-600">
                          {getAreaCount(client.id)}
                        </span>
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
                <AlertDialogTitle>Delete Client?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{deletingClient?.name}&quot;? This will also delete all associated areas, cleaning events, and records. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate(deletingClient.id)}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete Client"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </AuthGuard>
  );
}
