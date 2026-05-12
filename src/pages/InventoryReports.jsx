
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  FileText,
  Package,
  AlertTriangle,
  TrendingDown,
  Calendar,
  DollarSign
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AuthGuard from "../components/AuthGuard";

export default function InventoryReports() {
  const [timeRange, setTimeRange] = useState('7days');
  const [selectedClient, setSelectedClient] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ['inventory', user?.tenant_id],
    queryFn: () => user?.tenant_id
      ? base44.entities.InventoryItem.filter({ tenant_id: user.tenant_id }, '-created_date')
      : Promise.resolve([]),
    enabled: !!user?.tenant_id,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', user?.tenant_id],
    queryFn: () => user?.tenant_id
      ? base44.entities.Client.filter({ tenant_id: user.tenant_id })
      : Promise.resolve([]),
    enabled: !!user?.tenant_id,
  });

  const { data: counts = [] } = useQuery({
    queryKey: ['inventory-counts', user?.tenant_id],
    queryFn: () => user?.tenant_id
      ? base44.entities.InventoryCount.filter({ tenant_id: user.tenant_id }, '-count_timestamp', 100)
      : Promise.resolve([]),
    enabled: !!user?.tenant_id,
  });

  const { data: usage = [] } = useQuery({
    queryKey: ['inventory-usage', user?.tenant_id],
    queryFn: () => user?.tenant_id
      ? base44.entities.InventoryUsage.filter({ tenant_id: user.tenant_id }, '-usage_timestamp', 100)
      : Promise.resolve([]),
    enabled: !!user?.tenant_id,
  });

  const getStockStatus = (item) => {
    if (item.reorder_point && item.on_hand <= item.reorder_point) return 'critical';
    if (item.par_level && item.on_hand < item.par_level) return 'low';
    return 'good';
  };

  const filteredInventory = inventory.filter(item => {
    const clientMatch = selectedClient === 'all' || item.client_id === selectedClient;
    const status = getStockStatus(item);
    const statusMatch = statusFilter === 'all' || status === statusFilter;
    return clientMatch && statusMatch;
  });

  const getClientName = (clientId) => {
    return clients.find(c => c.id === clientId)?.name || 'Unknown';
  };

  // Calculate summary stats
  const totalValue = filteredInventory.reduce((sum, item) => 
    sum + (item.on_hand * (item.unit_cost || 0)), 0
  );
  const criticalItems = filteredInventory.filter(i => getStockStatus(i) === 'critical').length;
  const lowItems = filteredInventory.filter(i => getStockStatus(i) === 'low').length;

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
        'Status',
        'Vendor',
        'Last Count',
        'Last Used By',
        'Last Usage Note'
      ];

      const rows = filteredInventory.map(item => {
        // Find the most recent usage for this item
        const itemUsage = usage
          .filter(u => u.inventory_id === item.id)
          .sort((a, b) => new Date(b.usage_timestamp) - new Date(a.usage_timestamp));
        
        const lastUsage = itemUsage[0];

        return [
          getClientName(item.client_id),
          item.sku,
          item.name,
          item.category?.replace(/_/g, ' ') || '',
          item.unit || '',
          item.on_hand,
          item.par_level || 0,
          item.reorder_point || 0,
          (item.unit_cost || 0).toFixed(2),
          (item.on_hand * (item.unit_cost || 0)).toFixed(2),
          getStockStatus(item),
          item.vendor || '',
          item.last_count_at ? format(new Date(item.last_count_at), 'yyyy-MM-dd HH:mm') : '',
          lastUsage?.used_by_name || '',
          lastUsage?.note || ''
        ];
      });

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
    setIsExporting(false);
  };

  const exportCountHistory = () => {
    setIsExporting(true);
    try {
      const headers = [
        'Date/Time',
        'Client',
        'Item',
        'SKU',
        'Counted By',
        'Previous Qty',
        'New Qty',
        'Variance',
        'Notes'
      ];

      const rows = counts.map(count => {
        const item = inventory.find(i => i.id === count.inventory_id);
        const variance = count.quantity - (count.previous_quantity || 0);
        return [
          format(new Date(count.count_timestamp), 'yyyy-MM-dd HH:mm'),
          getClientName(count.client_id),
          item?.name || 'Unknown',
          item?.sku || '',
          count.counted_by_name,
          count.previous_quantity,
          count.quantity,
          variance >= 0 ? `+${variance}` : variance,
          count.notes?.replace(/,/g, ';') || ''
        ];
      });

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-count-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
    setIsExporting(false);
  };

  const exportUsageHistory = () => {
    setIsExporting(true);
    
    // DEBUG: Log what data we have
    // console.log('=== EXPORT USAGE DEBUG ===');
    // console.log('Total clients loaded:', clients.length);
    // console.log('All clients:', clients);
    // console.log('Total usage records:', usage.length);
    // console.log('Total inventory items:', inventory.length);
    
    try {
      const headers = [
        'Date/Time',
        'Client',
        'Item',
        'SKU',
        'Used By',
        'Quantity',
        'Note'
      ];

      const rows = usage.map(use => {
        const item = inventory.find(i => i.id === use.inventory_id);
        
        // Try to get client_id from multiple sources, prioritizing the usage record itself
        const clientId = use.client_id || item?.client_id;
        
        // DEBUG: Log each record
        // console.log('Processing usage record:', {
        //   usage_id: use.id,
        //   use_client_id: use.client_id,
        //   item_client_id: item?.client_id,
        //   final_clientId: clientId,
        //   item_name: item?.name
        // });
        
        // Find the client
        const client = clients.find(c => c.id === clientId);
        
        // console.log('Client lookup:', {
        //   looking_for: clientId,
        //   found: client,
        //   all_client_ids: clients.map(c => c.id)
        // });
        
        const clientName = client?.name || 'Unknown';
        
        return [
          format(new Date(use.usage_timestamp), 'yyyy-MM-dd HH:mm'),
          clientName,
          item?.name || 'Unknown',
          item?.sku || '',
          use.used_by_name,
          use.quantity,
          use.note?.replace(/,/g, ';') || ''
        ];
      });

      // console.log('Final export rows:', rows);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-usage-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
    setIsExporting(false);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Inventory Reports
              </h1>
              <p className="text-gray-600">Export and analyze inventory data</p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Items</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {filteredInventory.length}
                    </p>
                  </div>
                  <Package className="w-10 h-10 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Value</p>
                    <p className="text-3xl font-bold text-gray-900">
                      ${totalValue.toFixed(0)}
                    </p>
                  </div>
                  <DollarSign className="w-10 h-10 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Critical Stock</p>
                    <p className="text-3xl font-bold text-red-600">
                      {criticalItems}
                    </p>
                  </div>
                  <AlertTriangle className="w-10 h-10 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Low Stock</p>
                    <p className="text-3xl font-bold text-orange-600">
                      {lowItems}
                    </p>
                  </div>
                  <TrendingDown className="w-10 h-10 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Export Buttons */}
          <Card className="shadow-md mb-6">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Client Filter
                  </label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue />
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

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Stock Status
                  </label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={exportToCSV}
                  disabled={isExporting || filteredInventory.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Current Inventory
                </Button>
                <Button
                  onClick={exportCountHistory}
                  disabled={isExporting || counts.length === 0}
                  variant="outline"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Export Count History
                </Button>
                <Button
                  onClick={exportUsageHistory}
                  disabled={isExporting || usage.length === 0}
                  variant="outline"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Export Usage History
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Table */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Inventory Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">On Hand</TableHead>
                      <TableHead className="text-right">Par Level</TableHead>
                      <TableHead className="text-right">Reorder</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading || !user?.tenant_id ? ( // Added !user?.tenant_id to isLoading check
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8">
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ) : filteredInventory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                          No inventory items found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInventory.map(item => {
                        const status = getStockStatus(item);
                        const totalValue = item.on_hand * (item.unit_cost || 0);

                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {getClientName(item.client_id)}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {item.sku}
                            </TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="capitalize">
                              {item.category?.replace(/_/g, ' ')}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {item.on_hand} {item.unit}
                            </TableCell>
                            <TableCell className="text-right text-gray-600">
                              {item.par_level || '-'}
                            </TableCell>
                            <TableCell className="text-right text-gray-600">
                              {item.reorder_point || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              ${(item.unit_cost || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              ${totalValue.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  status === 'critical'
                                    ? 'destructive'
                                    : status === 'low'
                                    ? 'secondary'
                                    : 'default'
                                }
                                className={
                                  status === 'good'
                                    ? 'bg-green-100 text-green-800'
                                    : status === 'low'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : ''
                                }
                              >
                                {status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
