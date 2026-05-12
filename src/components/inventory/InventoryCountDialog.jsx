import React, { useState } from "react";
import { entities } from "@/lib/db";
import { uploadFile } from "@/lib/storage";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calculator } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/lib/toast";
import { reportError } from "@/lib/error-reporting";
import { trackEvent, EVENTS } from "@/lib/analytics";

export default function InventoryCountDialog({ item }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const createCountMutation = useMutation({
    mutationFn: async (data) => {
      let photo_url = null;
      if (data.photo) {
        const { file_url } = await uploadFile({ file: data.photo, folder: "inventory-counts" });
        photo_url = file_url;
      }

      await entities.InventoryCount.create({
        tenant_id: item.tenant_id,
        client_id: item.client_id,
        inventory_id: item.id,
        counted_by_id: user?.id,
        counted_by_name: data.countedByName || user?.full_name || "Unknown",
        quantity: data.quantity,
        previous_quantity: item.on_hand,
        photo_url,
        notes: data.notes,
        count_timestamp: new Date().toISOString(),
      });

      await entities.InventoryItem.update(item.id, {
        on_hand: data.quantity,
        last_count_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setOpen(false);
      toast.success(`Count recorded for ${item.name}`);
      trackEvent(EVENTS.INVENTORY_COUNT_RECORDED, { inventory_id: item.id });
    },
    onError: (error) => {
      reportError(error, { where: "InventoryCountDialog.submit", inventory_id: item.id });
      toast.error(`Failed to save count: ${error?.message ?? "Unknown error"}`);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    createCountMutation.mutate({
      countedByName: formData.get("countedByName") || user?.full_name || "System",
      quantity: Number.parseFloat(formData.get("quantity")),
      notes: formData.get("notes") || "",
      photo: null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Calculator className="w-4 h-4 mr-2" aria-hidden="true" />
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
            <p className="text-3xl font-bold text-gray-900">
              {item.on_hand} {item.unit}
            </p>
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
            <Input id="countedByName" name="countedByName" defaultValue={user?.full_name ?? ""} placeholder="Your name" />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" placeholder="Any discrepancies or observations…" className="h-20" />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={createCountMutation.isPending}>
              {createCountMutation.isPending ? "Saving…" : "Save Count"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
