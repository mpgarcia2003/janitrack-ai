
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, Plus, Clock, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isBefore } from "date-fns";
import ProjectDialog from "../components/projects/ProjectDialog";
import ProjectCard from "../components/projects/ProjectCard";
import AuthGuard from "../components/AuthGuard";

const STATUS_COLUMNS = [
  { id: 'open', label: 'Open', color: 'bg-gray-100' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-100' },
  { id: 'blocked', label: 'Blocked', color: 'bg-red-100' },
  { id: 'completed', label: 'Completed', color: 'bg-green-100' },
];

export default function Projects() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', user?.tenant_id],
    queryFn: () => user?.tenant_id
      ? base44.entities.Project.filter({ tenant_id: user.tenant_id }, '-created_date')
      : Promise.resolve([]),
    enabled: !!user?.tenant_id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const overdueCount = projects.filter(p => 
    p.due_date && isBefore(new Date(p.due_date), new Date()) && p.status !== 'completed'
  ).length;

  const getProjectsByStatus = (status) => {
    return projects.filter(p => p.status === status);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="p-4 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Projects & Tasks
              </h1>
              <p className="text-gray-600">Manage work orders and assignments</p>
              {overdueCount > 0 && (
                <div className="flex items-center gap-2 mt-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-semibold">{overdueCount} overdue project{overdueCount > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
            <ProjectDialog 
              open={showDialog}
              onOpenChange={setShowDialog}
              editingProject={editingProject}
              setEditingProject={setEditingProject}
            />
          </div>

          {isLoading ? (
            <div className="grid lg:grid-cols-4 gap-6">
              {STATUS_COLUMNS.map(col => (
                <div key={col.id} className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  {[1,2,3].map(i => (
                    <Skeleton key={i} className="h-48 w-full" />
                  ))}
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <Card className="shadow-md">
              <CardContent className="py-12 text-center">
                <FolderKanban className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Projects Yet</h3>
                <p className="text-gray-600 mb-4">Create your first project to get started</p>
                <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-4 gap-6">
              {STATUS_COLUMNS.map(column => {
                const columnProjects = getProjectsByStatus(column.id);
                
                return (
                  <div key={column.id} className="space-y-4">
                    <Card className={`${column.color} border-none shadow-sm`}>
                      <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                            {column.label}
                          </CardTitle>
                          <Badge variant="secondary" className="text-xs">
                            {columnProjects.length}
                          </Badge>
                        </div>
                      </CardHeader>
                    </Card>

                    <div className="space-y-3">
                      {columnProjects.map(project => (
                        <ProjectCard 
                          key={project.id}
                          project={project}
                          onEdit={() => {
                            setEditingProject(project);
                            setShowDialog(true);
                          }}
                          onDelete={(id) => deleteMutation.mutate(id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
