"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Action = { type: string; payload: unknown };

export function ReconciliationItemCard({
  title,
  subtitle,
  primaryAction,
  secondaryAction,
}: {
  title: string;
  subtitle?: string;
  primaryAction: { label: string; action: Action };
  secondaryAction?: { label: string; action: Action };
}) {
  // Em seguida vamos plugar as mutations reais
  const handle = (a: Action) => {
    console.log("Action:", a.type, a.payload);
  };

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-3">
        <div className="text-sm font-medium">{title}</div>
        {subtitle && <div className="text-xs opacity-75">{subtitle}</div>}
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={() => handle(primaryAction.action)}>
            {primaryAction.label}
          </Button>
          {secondaryAction && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handle(secondaryAction.action)}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
