import { useState } from "react";
import { entities } from "@/lib/db";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { isBefore } from "date-fns";

import ProjectDialog from "@/components/projects/ProjectDialog";
import ProjectCard from "@/components/projects/ProjectCard";
import EmptyState from "@/components/EmptyState";
import QueryErrorState from "@/components/QueryErrorState";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/lib/toast";
import { reportError } from "@/lib/error-reporting";

const STATUS_COLUMNS = [
  { id: "open", label: "Open", color: "bg-gray-100" },
  { id: "in_progress", label: "In Progress", color: "bg-emerald-50" },
  { id: "blocked", label: "Blocked", color: "bg-red-100" },
  { id: "completed", label: "Completed", color: "bg-emerald-100" },
];

export default function Projects() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const queryClient = useQueryClient();

  const [showDialog, setShowDialog] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const projectsQuery = useQuery({
    queryKey: ["projects", tenantId],
    queryFn: () =>
      tenantId
        ? entities.Project.filter({ tenant_id: tenantId }, "-created_at")
        : Promise.resolve([]),
    enabled: !!tenantId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
    },
    onError: (error) => {
      reportError(error, { where: "Projects.delete" });
      toast.error(`Failed to delete project: ${error?.message ?? "Unknown error"}`);
    },
  });

  if (projectsQuery.error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 max-w-7xl mx-auto">
        <QueryErrorState error={projectsQuery.error} onRetry={() => projectsQuery.refetch()} />
      </div>
    );
  }

  const projects = projectsQuery.data ?? [];
  const overdueCount = projects.filter(
    (p) => p.due_date && isBefore(new Date(p.due_date), new Date()) && p.status !== "completed"
  ).length;

  const getProjectsByStatus = (status) => projects.filter((p) => p.status === status);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Projects & Tasks</h1>
            <p className="text-gray-600">Manage work orders and assignments</p>
            {overdueCount > 0 ? (
              <div className="flex items-center gap-2 mt-2 text-red-600">
                <AlertCircle className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm font-semibold">
                  {overdueCount} overdue project{overdueCount > 1 ? "s" : ""}
                </span>
              </div>
            ) : null}
          </div>
          <ProjectDialog
            open={showDialog}
            onOpenChange={setShowDialog}
            editingProject={editingProject}
            setEditingProject={setEditingProject}
          />
        </div>

        {projectsQuery.isLoading ? (
          <div className="grid lg:grid-cols-4 gap-6">
            {STATUS_COLUMNS.map((col) => (
              <div key={col.id} className="space-y-4">
                <Skeleton className="h-10 w-full" />
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Create your first project or work request to get started."
            actionLabel="Create first project"
            onAction={() => setShowDialog(true)}
          />
        ) : (
          <div className="grid lg:grid-cols-4 gap-6">
            {STATUS_COLUMNS.map((column) => {
              const columnProjects = getProjectsByStatus(column.id);
              return (
                <div key={column.id} className="space-y-4">
                  <Card className={`${column.color} border-none shadow-sm`}>
                    <CardHeader className="p-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold uppercase tracking-wide">{column.label}</CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {columnProjects.length}
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>

                  <div className="space-y-3">
                    {columnProjects.map((project) => (
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
  );
}
