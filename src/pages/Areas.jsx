import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, QrCode, AlertTriangle, Edit, Trash2, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

import QRCodeDisplay from "@/components/areas/QRCodeDisplay";
import FeedbackQRDisplay from "@/components/areas/FeedbackQRDisplay";
import EmptyState from "@/components/EmptyState";
import QueryErrorState from "@/components/QueryErrorState";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/lib/toast";
import { reportError } from "@/lib/error-reporting";

const isDevOrAdmin = (user) => import.meta.env?.DEV === true || user?.role === "admin";

export default function Areas() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const queryClient = useQueryClient();

  const [showDialog, setShowDialog] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [deletingArea, setDeletingArea] = useState(null);
  const [selectedClient, setSelectedClient] = useState("all");

  const areasQuery = useQuery({
    queryKey: ["areas", tenantId],
    queryFn: () =>
      tenantId
        ? base44.entities.Area.filter({ tenant_id: tenantId }, "-created_date")
        : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const clientsQuery = useQuery({
    queryKey: ["clients", tenantId],
    queryFn: () =>
      tenantId ? base44.entities.Client.filter({ tenant_id: tenantId }) : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const areas = areasQuery.data ?? [];
  const clients = clientsQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Area.create({ ...data, tenant_id: tenantId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      setShowDialog(false);
      setEditingArea(null);
      toast.success("Area created");
    },
    onError: (error) => {
      reportError(error, { where: "Areas.create" });
      toast.error(`Failed to create area: ${error?.message ?? "Unknown error"}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Area.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      setShowDialog(false);
      setEditingArea(null);
      toast.success("Area updated");
    },
    onError: (error) => {
      reportError(error, { where: "Areas.update" });
      toast.error(`Failed to update area: ${error?.message ?? "Unknown error"}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Area.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      setDeletingArea(null);
      toast.success("Area deleted");
    },
    onError: (error) => {
      reportError(error, { where: "Areas.delete" });
      toast.error(`Failed to delete area: ${error?.message ?? "Unknown error"}`);
    },
  });

  const createTestAreasMutation = useMutation({
    mutationFn: async (testAreasData) =>
      Promise.all(testAreasData.map((data) => base44.entities.Area.create({ ...data, tenant_id: tenantId }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      toast.success("Test areas created");
    },
    onError: (error) => {
      reportError(error, { where: "Areas.createTestData" });
      toast.error(`Failed to create test areas: ${error?.message ?? "Unknown error"}`);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const data = {
      client_id: formData.get("client_id"),
      name: formData.get("name"),
      location_desc: formData.get("location_desc"),
      qr_token: editingArea?.qr_token ?? `qr_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      risk_level: formData.get("risk_level") ?? "normal",
      cadence_minutes: Number.parseInt(formData.get("cadence_minutes")) || 240,
    };

    if (editingArea) updateMutation.mutate({ id: editingArea.id, data });
    else createMutation.mutate(data);
  };

  const toggleTroubleArea = (area) => {
    const newRiskLevel = area.risk_level === "trouble" ? "normal" : "trouble";
    const newCadence = newRiskLevel === "trouble" ? 120 : 240;
    updateMutation.mutate({ id: area.id, data: { risk_level: newRiskLevel, cadence_minutes: newCadence } });
  };

  const handleAddTestData = () => {
    if (clients.length === 0) {
      toast.error("Please add at least one client before adding test areas.");
      return;
    }
    const firstClientId = clients[0].id;
    const testAreas = Array.from({ length: 5 }).map((_, i) => ({
      client_id: firstClientId,
      name: `Test Area ${i + 1}`,
      location_desc: `Location description for Test Area ${i + 1}`,
      qr_token: `qr_test_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      risk_level: i % 2 === 0 ? "normal" : "trouble",
      cadence_minutes: i % 2 === 0 ? 240 : 120,
    }));
    createTestAreasMutation.mutate(testAreas);
  };

  const filteredAreas =
    selectedClient === "all" ? areas : areas.filter((a) => a.client_id === selectedClient);
  const getClientName = (clientId) => clients.find((c) => c.id === clientId)?.name ?? "Unknown";

  if (areasQuery.isError) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 max-w-7xl mx-auto">
        <QueryErrorState error={areasQuery.error} onRetry={() => areasQuery.refetch()} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Areas & QR Codes</h1>
            <p className="text-gray-600">Manage cleaning areas and generate QR codes</p>
          </div>
          <div className="flex gap-3">
            {isDevOrAdmin(user) ? (
              <Button
                onClick={handleAddTestData}
                disabled={createTestAreasMutation.isPending || clients.length === 0}
                variant="outline"
                className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
              >
                {createTestAreasMutation.isPending ? "Adding…" : "Add Test Data"}
              </Button>
            ) : null}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={clients.length === 0}>
                  <Plus className="w-5 h-5 mr-2" aria-hidden="true" />
                  Add Area
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingArea ? "Edit Area" : "Add New Area"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="client_id">Client Location *</Label>
                    <Select name="client_id" required defaultValue={editingArea?.client_id}>
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
                    <Label htmlFor="name">Area Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      defaultValue={editingArea?.name}
                      placeholder="e.g., Men's Room 1F"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location_desc">Location Description</Label>
                    <Input
                      id="location_desc"
                      name="location_desc"
                      defaultValue={editingArea?.location_desc}
                      placeholder="Additional details"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cadence_minutes">Cleaning Cadence (minutes)</Label>
                    <Input
                      id="cadence_minutes"
                      name="cadence_minutes"
                      type="number"
                      defaultValue={editingArea?.cadence_minutes ?? 240}
                    />
                  </div>
                  <div>
                    <Label htmlFor="risk_level">Risk Level</Label>
                    <Select name="risk_level" defaultValue={editingArea?.risk_level ?? "normal"}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="trouble">Trouble</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowDialog(false);
                        setEditingArea(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                      {editingArea ? "Update Area" : "Create Area"}
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
              <SelectItem value="all">All clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {areasQuery.isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="Add a client first"
            description="You need at least one client location before you can create areas."
          />
        ) : filteredAreas.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No areas yet"
            description="Create areas to generate QR codes for check-in and feedback."
            actionLabel="Add your first area"
            onAction={() => setShowDialog(true)}
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAreas.map((area) => (
              <Card
                key={area.id}
                className={`shadow-md hover:shadow-lg transition-shadow ${
                  area.risk_level === "trouble" ? "border-2 border-orange-500" : ""
                }`}
              >
                <CardHeader
                  className={`border-b ${
                    area.risk_level === "trouble"
                      ? "bg-gradient-to-r from-orange-50 to-red-50"
                      : "bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{area.name}</CardTitle>
                        {area.risk_level === "trouble" ? (
                          <AlertTriangle className="w-5 h-5 text-orange-600" aria-hidden="true" />
                        ) : null}
                      </div>
                      <p className="text-sm text-gray-600">{getClientName(area.client_id)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${area.name}`}
                        onClick={() => {
                          setEditingArea(area);
                          setShowDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${area.name}`}
                        onClick={() => setDeletingArea(area)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                      Cleaning Check-In QR
                    </h4>
                    <QRCodeDisplay
                      token={area.qr_token}
                      areaName={area.name}
                      clientCode={clients.find((c) => c.id === area.client_id)?.code}
                      clientName={clients.find((c) => c.id === area.client_id)?.name}
                    />
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Star className="w-4 h-4 text-purple-600" aria-hidden="true" />
                      Feedback Rating QR
                    </h4>
                    <FeedbackQRDisplay
                      token={area.qr_token}
                      areaName={area.name}
                      clientCode={clients.find((c) => c.id === area.client_id)?.code}
                      clientName={clients.find((c) => c.id === area.client_id)?.name}
                    />
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    {area.location_desc ? <p className="text-sm text-gray-600">{area.location_desc}</p> : null}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Cadence</span>
                      <span className="font-semibold">{area.cadence_minutes} min</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Status</span>
                      <Badge variant={area.risk_level === "trouble" ? "destructive" : "secondary"}>
                        {area.risk_level}
                      </Badge>
                    </div>
                  </div>

                  <Button
                    variant={area.risk_level === "trouble" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => toggleTroubleArea(area)}
                  >
                    {area.risk_level === "trouble" ? "Mark as Normal" : "Mark as Trouble"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AlertDialog open={!!deletingArea} onOpenChange={() => setDeletingArea(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete area?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{deletingArea?.name}&quot;? This will also delete all
                cleaning events for this area. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingArea && deleteMutation.mutate(deletingArea.id)}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete Area"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
