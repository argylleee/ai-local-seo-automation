"use client";

import { addCompetitor, addCompetitorMetric } from "@/app/competitors/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionState } from "react";

export function AddCompetitorForm({ businessId }: { businessId: string }) {
  const [state, formAction, isPending] = useActionState(addCompetitor, null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="businessId" value={businessId} />
      <div className="space-y-1.5">
        <Label htmlFor="competitor-name">Competitor name</Label>
        <Input id="competitor-name" name="name" required maxLength={200} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="competitor-website">Website</Label>
        <Input id="competitor-website" name="website" type="url" placeholder="https://" />
      </div>
      {state?.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Adding..." : "Add competitor"}
      </Button>
    </form>
  );
}

export function AddCompetitorMetricForm({ competitorId }: { competitorId: string }) {
  const [state, formAction, isPending] = useActionState(addCompetitorMetric, null);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="competitorId" value={competitorId} />
      <div className="space-y-1">
        <Label htmlFor={`metric-type-${competitorId}`} className="text-xs">
          Metric
        </Label>
        <Input
          id={`metric-type-${competitorId}`}
          name="metricType"
          placeholder="review_count"
          className="h-8 w-36"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`metric-value-${competitorId}`} className="text-xs">
          Value
        </Label>
        <Input
          id={`metric-value-${competitorId}`}
          name="value"
          type="number"
          step="any"
          className="h-8 w-24"
        />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        Add
      </Button>
      {state?.error ? <p className="text-destructive w-full text-xs">{state.error}</p> : null}
    </form>
  );
}
