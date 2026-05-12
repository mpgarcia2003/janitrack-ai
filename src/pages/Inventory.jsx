import React, { useState } from "react";
import { entities } from "@/lib/db";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Plus, AlertCircle, TrendingDown, TrendingUp, Trash2, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
import { format } from "date-fns";

import InventoryCountDialog from "@/components/inventory/InventoryCountDialog";
import InventoryUsageDialog from "@/components/inventory/InventoryUsageDialog";
import EmptyState from "@/components/EmptyState";
import QueryErrorState from "@/components/QueryErrorState";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/lib/toast";
import { reportError } from "@/lib/error-reporting";

export default function Inventory() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const queryClient = useQueryClient();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState(() => {
    if (typeof window === "undefined") return "all";
    const params = new URLSearchParams(window.location.search);
    return params.get("client") ?? "all";
  });
  const [deletingItem, setDeletingItem] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const inventoryQuery = useQuery({
    queryKey: ["inventory", tenantId],
    queryFn: () =>
      tenantId
        ? entities.InventoryItem.filter({ tenant_id: tenantId }, "-created_at")
        : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const clientsQuery = useQuery({
    queryKey: ["clients", tenantId],
    queryFn: () =>
      tenantId ? entities.Client.filter({ tenant_id: tenantId }) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const inventory = inventoryQuery.data ?? [];
  const clients = clientsQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data) =>
      entities.InventoryItem.create({ ...data, tenant_id: tenantId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setShowAddDialog(false);
      toast.success("Inventory item added");
    },
    onError: (error) => {
      reportError(error, { where: "Inventory.create" });
      toast.error(`Failed to add item: ${error?.message ?? "Unknown error"}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.InventoryItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setDeletingItem(null);
      toast.success("Item deleted");
    },
    onError: (error) => {
      reportError(error, { where: "Inventory.delete" });
      toast.error(`Failed to delete item: ${error?.message ?? "Unknown error"}`);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    createMutation.mutate({
      client_id: formData.get("client_id"),
      sku: formData.get("sku"),
      name: formData.get("name"),
      category: formData.get("category"),
      unit: formData.get("unit"),
      par_level: Number.parseFloat(formData.get("par_level")) || 0,
      on_hand: Number.parseFloat(formData.get("on_hand")) || 0,
      reorder_point: Number.parseFloat(formData.get("reorder_point")) || 0,
      vendor: formData.get("vendor"),
      unit_cost: Number.parseFloat(formData.get("unit_cost")) || 0,
    });
  };

  const filteredInventory =
    selectedClient === "all" ? inventory : inventory.filter((i) => i.client_id === selectedClient);

  const getStockStatus = (item) => {
    if (item.reorder_point && item.on_hand <= item.reorder_point) {
      return { status: "critical", color: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle };
    }
    if (item.par_level && item.on_hand < item.par_level) {
      return { status: "low", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: TrendingDown };
    }
    return { status: "good", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: TrendingUp };
  };

  const exportToCSV = () => {
    setIsExporting(true);
    try {
      const headers = [
        "Client",
        "SKU",
        "Item Name",
        "Category",
        "Unit",
        "On Hand",
        "Par Level",
        "Reorder Point",
        "Unit Cost",
        "Total Value",
        "Vendor",
      ];
      const getClientName = (clientId) => clients.find((c) => c.id === clientId)?.name ?? "Unknown";
      const rows = filteredInventory.map((item) => [
        getClientName(item.client_id),
        item.sku,
        item.name,
        item.category?.replace(/_/g, " ") ?? "",
        item.unit ?? "",
        item.on_hand,
        item.par_level ?? 0,
        item.reorder_point ?? 0,
        item.unit_cost ?? 0,
        (item.on_hand * (item.unit_cost ?? 0)).toFixed(2),
        item.vendor ?? "",
      ]);
      const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventory-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      reportError(error, { where: "Inventory.exportToCSV" });
      toast.error("Failed to export CSV");
    } finally {
      setIsExporting(false);
    }
  };

  if (inventoryQuery.isError) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 max-w-7xl mx-auto">
        <QueryErrorState error={inventoryQuery.error} onRetry={() => inventoryQuery.refetch()} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Inventory Management</h1>
            <p className="text-gray-600">Track supplies and reorder points</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={exportToCSV}
              disabled={isExporting || filteredInventory.length === 0}
              variant="outline"
              className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
            >
              <Download className="w-5 h-5 mr-2" aria-hidden="true" />
              Export CSV
            </Button>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={clients.length === 0}>
                  <Plus className="w-5 h-5 mr-2" aria-hidden="true" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Inventory Item</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="client_id">Client Location *</Label>
                      <Select name="client_id" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="sku">SKU *</Label>
                      <Input id="sku" name="sku" required placeholder="e.g., CLN-001" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="name">Item Name *</Label>
                    <Input id="name" name="name" required placeholder="e.g., All-Purpose Cleaner" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select name="category" defaultValue="cleaning_supplies">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cleaning_supplies">Cleaning Supplies</SelectItem>
                          <SelectItem value="paper_products">Paper Products</SelectItem>
                          <SelectItem value="chemicals">Chemicals</SelectItem>
                          <SelectItem value="equipment">Equipment</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="unit">Unit</Label>
                      <Select name="unit" defaultValue="ea">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ea">Each</SelectItem>
                          <SelectItem value="roll">Roll</SelectItem>
                          <SelectItem value="bottle">Bottle</SelectItem>
                          <SelectItem value="case">Case</SelectItem>
                          <SelectItem value="gallon">Gallon</SelectItem>
                          <SelectItem value="box">Box</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="unit_cost">Unit Cost ($)</Label>
                      <Input id="unit_cost" name="unit_cost" type="number" step="0.01" defaultValue="0" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="on_hand">On Hand</Label>
                      <Input id="on_hand" name="on_hand" type="number" defaultValue="0" />
                    </div>
                    <div>
                      <Label htmlFor="par_level">Par Level</Label>
                      <Input id="par_level" name="par_level" type="number" defaultValue="0" />
                    </div>
                    <div>
                      <Label htmlFor="reorder_point">Reorder Point</Label>
                      <Input id="reorder_point" name="reorder_point" type="number" defaultValue="0" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="vendor">Vendor</Label>
                    <Input id="vendor" name="vendor" placeholder="Supplier name" />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Saving…" : "Add Item"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="mb-6">
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filter by client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {inventoryQuery.isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Add a client first"
            description="Inventory items belong to a client location. Create one before adding supplies."
          />
        ) : filteredInventory.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No inventory items"
            description="Add items to start tracking supplies and reorder points."
            actionLabel="Add first item"
            onAction={() => setShowAddDialog(true)}
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInventory.map((item) => {
              const stockInfo = getStockStatus(item);
              const StatusIcon = stockInfo.icon;
              return (
                <Card key={item.id} className="shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="border-b">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">SKU: {item.sku}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${stockInfo.color} border`}>
                          <StatusIcon className="w-5 h-5" aria-hidden="true" />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${item.name}`}
                          onClick={() => setDeletingItem(item)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">{item.on_hand}</p>
                        <p className="text-xs text-gray-600 mt-1">On Hand</p>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-lg">
                        <p className="text-2xl font-bold text-emerald-700">{item.par_level || "-"}</p>
                        <p className="text-xs text-gray-600 mt-1">Par Level</p>
                      </div>
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <p className="text-2xl font-bold text-orange-600">{item.reorder_point || "-"}</p>
                        <p className="text-xs text-gray-600 mt-1">Reorder At</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Category</span>
                        <span className="font-medium capitalize">{item.category?.replace(/_/g, " ")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Unit</span>
                        <span className="font-medium uppercase">{item.unit}</span>
                      </div>
                      {item.vendor ? (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Vendor</span>
                          <span className="font-medium">{item.vendor}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                      <InventoryCountDialog item={item} />
                      <InventoryUsageDialog item={item} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <AlertDialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete inventory item?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{deletingItem?.name}&quot; (SKU: {deletingItem?.sku})? This will also delete all count and usage records. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingItem && deleteMutation.mutate(deletingItem.id)}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete Item"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
