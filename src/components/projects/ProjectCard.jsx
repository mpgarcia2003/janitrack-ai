import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, User, Edit, AlertCircle, Trash2, CheckCircle2 } from "lucide-react";
import { format, isBefore, differenceInDays } from "date-fns";
import { entities } from "@/lib/db";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export default function ProjectCard({ project, onEdit, onDelete }) {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const queryClient = useQueryClient();

  const toggleCompleteMutation = useMutation({
    mutationFn: async () => {
      const isCompleting = project.status !== 'completed';
      return entities.Project.update(project.id, {
        status: isCompleting ? 'completed' : project.status === 'blocked' ? 'blocked' : 'in_progress',
        completed_at: isCompleting ? new Date().toISOString() : null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const isOverdue = project.due_date && 
    isBefore(new Date(project.due_date), new Date()) && 
    project.status !== 'completed';
  
  const daysUntilDue = project.due_date 
    ? differenceInDays(new Date(project.due_date), new Date())
    : null;

  const isCompleted = project.status === 'completed';

  return (
    <>
      <Card className={`shadow-md hover:shadow-lg transition-shadow ${isCompleted ? 'opacity-75' : ''}`}>
        <CardHeader className="p-4 border-b">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3 flex-1">
              <Checkbox
                checked={isCompleted}
                onCheckedChange={() => toggleCompleteMutation.mutate()}
                className="mt-1"
              />
              <div className="flex-1">
                <CardTitle className={`text-base font-semibold line-clamp-2 ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                  {project.title}
                </CardTitle>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge className={PRIORITY_COLORS[project.priority]}>
                    {project.priority}
                  </Badge>
                  {isOverdue && !isCompleted && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Overdue
                    </Badge>
                  )}
                  {isCompleted && project.completed_at && (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Done {format(new Date(project.completed_at), 'MMM d')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onEdit}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {project.description && (
            <p className={`text-sm line-clamp-2 ${isCompleted ? 'text-gray-500' : 'text-gray-600'}`}>
              {project.description}
            </p>
          )}
          
          {project.assigned_to_name && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <User className="w-4 h-4 text-gray-400" />
              <span>{project.assigned_to_name}</span>
            </div>
          )}
          
          {project.due_date && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className={`w-4 h-4 ${isOverdue && !isCompleted ? 'text-red-500' : 'text-gray-400'}`} />
              <span className={isOverdue && !isCompleted ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                {format(new Date(project.due_date), 'MMM d, yyyy')}
              </span>
              {daysUntilDue !== null && !isOverdue && !isCompleted && daysUntilDue <= 7 && (
                <span className="text-xs text-orange-600">
                  ({daysUntilDue}d left)
                </span>
              )}
            </div>
          )}
          
          {project.estimated_hours && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>{project.estimated_hours}h estimated</span>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{project.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(project.id);
                setShowDeleteDialog(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}