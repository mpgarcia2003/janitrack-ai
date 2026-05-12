import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

/**
 * Renders a recoverable error UI for failed react-query fetches.
 *
 * <QueryErrorState error={query.error} onRetry={() => query.refetch()} />
 */
export default function QueryErrorState({ error, onRetry, title = "Couldn't load this section" }) {
  const message = error?.message ?? "An unexpected error occurred.";
  return (
    <Card className="shadow-md border-red-200">
      <CardContent className="py-10 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-600 mb-5">{message}</p>
        {onRetry ? (
          <Button onClick={onRetry} variant="outline">
            Try again
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
