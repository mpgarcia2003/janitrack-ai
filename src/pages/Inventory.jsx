
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, AlertCircle, TrendingDown, TrendingUp, Trash2, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import InventoryCountDialog from "../components/inventory/InventoryCountDialog";
import InventoryUsageDialog from "../components/inventory/InventoryUsageDialog";
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
import { format } from 'date-fns';
import AuthGuard from "../components/AuthGuard";

export default function Inventory() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState('all');
  const [deletingItem, setDeletingItem] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  // Fetch current user details to get tenant_id and check URL params
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      // Handle error or no user logged in
      setUser(null);
    });

    // Check for client filter from URL
    const urlParams = new URLSearchParams(window.location.search);
    const clientParam = urlParams.get('client');
    if (clientParam) {
      setSelectedClient(clientParam);
    }
  }, []); // Empty dependency array means this runs once on mount, which is correct for initial URL parsing

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ['inventory', user?.tenant_id], // Include tenant_id in queryKey
    queryFn: () => user?.tenant_id // Filter by tenant_id
      ? base44.entities.InventoryItem.filter({ tenant_id: user.tenant_id }, '-created_date')
      : Promise.resolve([]), // Return empty array if no tenant_id
    enabled: !!user?.tenant_id, // Only run query if tenant_id is available
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', user?.tenant_id], // Include tenant_id in queryKey
    queryFn: () => user?.tenant_id // Filter by tenant_id
      ? base44.entities.Client.filter({ tenant_id: user.tenant_id })
      : Promise.resolve([]), // Return empty array if no tenant_id
    enabled: !!user?.tenant_id, // Only run query if tenant_id is available
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.InventoryItem.create({
      ...data,
      tenant_id: user.tenant_id // Automatically add tenant_id to new items
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', user?.tenant_id] }); // Invalidate with tenant_id
      setShowAddDialog(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.InventoryItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', user?.tenant_id] }); // Invalidate with tenant_id
      setDeletingItem(null);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    createMutation.mutate({
      // tenant_id is now added automatically in createMutation function, removed from here
      client_id: formData.get('client_id'),
      sku: formData.get('sku'),
      name: formData.get('name'),
      category: formData.get('category'),
      unit: formData.get('unit'),
      par_level: parseFloat(formData.get('par_level')) || 0,
      on_hand: parseFloat(formData.get('on_hand')) || 0,
      reorder_point: parseFloat(formData.get('reorder_point')) || 0,
      vendor: formData.get('vendor'),
      unit_cost: parseFloat(formData.get('unit_cost')) || 0,
    });
  };

  const filteredInventory = selectedClient === 'all' 
    ? inventory 
    : inventory.filter(i => i.client_id === selectedClient);

  const getStockStatus = (item) => {
    if (item.reorder_point && item.on_hand <= item.reorder_point) {
      return { status: 'critical', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle };
    }
    if (item.par_level && item.on_hand < item.par_level) {
      return { status: 'low', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: TrendingDown };
    }
    return { status: 'good', color: 'bg-green-100 text-green-800 border-green-200', icon: TrendingUp };
  };

  const exportToCSV = () => {
    setIsExporting(true);
    try {
      const headers = [
        'Client',
        'SKU',
        'Item Name',
        'Category',
        'Unit',
        'On Hand',
        'Par Level',
        'Reorder Point',
        'Unit Cost',
        'Total Value',
        'Vendor'
      ];

      const getClientName = (clientId) => {
        return clients.find(c => c.id === clientId)?.name || 'Unknown';
      };

      const rows = filteredInventory.map(item => [
        getClientName(item.client_id),
        item.sku,
        item.name,
        item.category?.replace(/_/g, ' ') || '',
        item.unit || '',
        item.on_hand,
        item.par_level || 0,
        item.reorder_point || 0,
        item.unit_cost || 0,
        (item.on_hand * (item.unit_cost || 0)).toFixed(2),
        item.vendor || ''
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Inventory Management
              </h1>
              <p className="text-gray-600">Track supplies and reorder points</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={exportToCSV}
                disabled={isExporting || filteredInventory.length === 0}
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                <Download className="w-5 h-5 mr-2" />
                Export CSV
              </Button>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-5 h-5 mr-2" />
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
                            {clients.map(client => (
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
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                        Add Item
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Filter */}
          <div className="mb-6">
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filter by client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(i => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          ) : filteredInventory.length === 0 ? (
            <Card className="shadow-md">
              <CardContent className="py-12 text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Inventory Items</h3>
                <p className="text-gray-600 mb-4">Add items to start tracking inventory</p>
                <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Item
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredInventory.map(item => {
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
                            <StatusIcon className="w-5 h-5" />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingItem(item)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
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
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">{item.par_level || '-'}</p>
                          <p className="text-xs text-gray-600 mt-1">Par Level</p>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-lg">
                          <p className="text-2xl font-bold text-orange-600">{item.reorder_point || '-'}</p>
                          <p className="text-xs text-gray-600 mt-1">Reorder At</p>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Category</span>
                          <span className="font-medium capitalize">{item.category?.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Unit</span>
                          <span className="font-medium uppercase">{item.unit}</span>
                        </div>
                        {item.vendor && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Vendor</span>
                            <span className="font-medium">{item.vendor}</span>
                          </div>
                        )}
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

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Inventory Item?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{deletingItem?.name}" (SKU: {deletingItem?.sku})? This will also delete all count and usage records. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate(deletingItem.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Item
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </AuthGuard>
  );
}
