import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Generic empty-state card.
 *
 * <EmptyState icon={Building2} title="No clients yet" description="..." actionLabel="Add client" onAction={...} />
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) {
  return (
    <Card className="shadow-md">
      <CardContent className="py-12 text-center">
        {Icon ? <Icon className="w-16 h-16 mx-auto mb-4 text-gray-400" /> : null}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        {description ? <p className="text-gray-600 mb-4">{description}</p> : null}
        <div className="flex gap-3 justify-center">
          {onAction && actionLabel ? (
            <Button onClick={onAction} className="bg-blue-600 hover:bg-blue-700">
              {actionLabel}
            </Button>
          ) : null}
          {onSecondaryAction && secondaryActionLabel ? (
            <Button variant="outline" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
