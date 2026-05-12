
import React, { useState, useEffect } from "react";
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
import { Calculator } from "lucide-react";

export default function InventoryCountDialog({ item }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const createCountMutation = useMutation({
    mutationFn: async (data) => {
      let photoUrl = null;
      if (data.photo) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: data.photo });
        photoUrl = file_url;
      }

      await base44.entities.InventoryCount.create({
        tenant_id: item.tenant_id,
        client_id: item.client_id,
        inventory_id: item.id,
        counted_by_id: user?.id,
        counted_by_name: data.countedByName || user?.full_name || 'Unknown',
        quantity: data.quantity,
        previous_quantity: item.on_hand,
        photo_url: photoUrl,
        notes: data.notes,
        ip_address: 'captured-by-system',
        count_timestamp: new Date().toISOString()
      });

      await base44.entities.InventoryItem.update(item.id, {
        on_hand: data.quantity,
        last_count_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setOpen(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    createCountMutation.mutate({
      countedByName: formData.get('countedByName') || user?.full_name || 'System',
      quantity: parseFloat(formData.get('quantity')),
      notes: formData.get('notes') || '',
      photo: formData.get('photo') // Assuming a file input named 'photo' might exist, otherwise it's null
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Calculator className="w-4 h-4 mr-2" />
          Count
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Physical Count: {item.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Current On Hand</p>
            <p className="text-3xl font-bold text-gray-900">{item.on_hand} {item.unit}</p>
          </div>

          <div>
            <Label htmlFor="quantity">New Count *</Label>
            <Input 
              id="quantity" 
              name="quantity" 
              type="number" 
              step="0.01"
              required 
              placeholder="Enter actual count"
              className="text-lg"
            />
          </div>

          <div>
            <Label htmlFor="countedByName">Counted By</Label>
            <Input 
              id="countedByName" 
              name="countedByName" 
              defaultValue={user?.full_name || ''}
              placeholder="Your name"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea 
              id="notes" 
              name="notes" 
              placeholder="Any discrepancies or observations..."
              className="h-20"
            />
          </div>

          {/* Optional: Add a file input for photo if needed in the UI */}
          {/*
          <div>
            <Label htmlFor="photo">Upload Photo</Label>
            <Input
              id="photo"
              name="photo"
              type="file"
              accept="image/*"
            />
          </div>
          */}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Save Count
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
