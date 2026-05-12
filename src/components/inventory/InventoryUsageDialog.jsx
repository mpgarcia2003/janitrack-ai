
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Minus } from "lucide-react";

export default function InventoryUsageDialog({ item }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const createUsageMutation = useMutation({
    mutationFn: async (data) => {
      // Create usage record with explicit client_id
      await base44.entities.InventoryUsage.create({
        tenant_id: item.tenant_id,
        client_id: item.client_id,
        inventory_id: item.id,
        used_by_id: user?.id,
        used_by_name: data.usedByName || user?.full_name || 'Unknown',
        quantity: data.quantity,
        note: data.note,
        usage_timestamp: new Date().toISOString()
      });

      // Update inventory item
      const newQuantity = item.on_hand - data.quantity;
      await base44.entities.InventoryItem.update(item.id, {
        on_hand: Math.max(0, newQuantity)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-usage'] });
      setOpen(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    createUsageMutation.mutate({
      usedByName: formData.get('usedByName') || user?.full_name || 'System',
      quantity: parseFloat(formData.get('quantity')),
      note: formData.get('note') || ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Minus className="w-4 h-4 mr-2" />
          Use
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Usage: {item.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Available</p>
            <p className="text-3xl font-bold text-gray-900">{item.on_hand} {item.unit}</p>
          </div>

          <div>
            <Label htmlFor="quantity">Quantity Used *</Label>
            <Input 
              id="quantity" 
              name="quantity" 
              type="number" 
              step="0.01"
              max={item.on_hand}
              required 
              placeholder="Amount used"
              className="text-lg"
            />
          </div>

          <div>
            <Label htmlFor="usedByName">Used By</Label>
            <Input 
              id="usedByName" 
              name="usedByName" 
              defaultValue={user?.full_name || ''}
              placeholder="Your name"
            />
          </div>

          <div>
            <Label htmlFor="note">Note</Label>
            <Textarea 
              id="note" 
              name="note" 
              placeholder="Where was this used?..."
              className="h-20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Record Usage
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
