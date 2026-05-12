
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

export default function ProjectDialog({ open, onOpenChange, editingProject, setEditingProject }) {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', user?.tenant_id],
    queryFn: () => user?.tenant_id
      ? base44.entities.Client.filter({ tenant_id: user.tenant_id })
      : Promise.resolve([]),
    enabled: !!user?.tenant_id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create({
      ...data,
      tenant_id: user.tenant_id // Ensure tenant_id is set for new projects
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onOpenChange(false);
      setEditingProject(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onOpenChange(false);
      setEditingProject(null);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const data = {
      // tenant_id: 'default-tenant', // This will now be handled by the createMutation or the existing project's tenant_id
      client_id: formData.get('client_id'),
      title: formData.get('title'),
      description: formData.get('description'),
      status: formData.get('status') || 'open',
      priority: formData.get('priority') || 'medium',
      due_date: formData.get('due_date') || null,
      assigned_to_name: formData.get('assigned_to_name'),
      estimated_hours: parseFloat(formData.get('estimated_hours')) || null,
    };

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) setEditingProject(null);
    }}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-5 h-5 mr-2" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingProject ? 'Edit Project' : 'Create New Project'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="client_id">Client Location *</Label>
            <Select name="client_id" required defaultValue={editingProject?.client_id}>
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
            <Label htmlFor="title">Project Title *</Label>
            <Input 
              id="title" 
              name="title" 
              required
              defaultValue={editingProject?.title}
              placeholder="e.g., HVAC System Maintenance"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              name="description"
              defaultValue={editingProject?.description}
              placeholder="Project details and requirements..."
              className="h-24"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={editingProject?.status || 'open'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select name="priority" defaultValue={editingProject?.priority || 'medium'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input 
                id="due_date" 
                name="due_date" 
                type="date"
                defaultValue={editingProject?.due_date}
              />
            </div>
            <div>
              <Label htmlFor="estimated_hours">Est. Hours</Label>
              <Input 
                id="estimated_hours" 
                name="estimated_hours" 
                type="number"
                step="0.5"
                defaultValue={editingProject?.estimated_hours}
                placeholder="8"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="assigned_to_name">Assigned To</Label>
            <Input 
              id="assigned_to_name" 
              name="assigned_to_name"
              defaultValue={editingProject?.assigned_to_name}
              placeholder="Team member name"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setEditingProject(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {editingProject ? 'Update' : 'Create'} Project
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
