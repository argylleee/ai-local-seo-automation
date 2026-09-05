"use client";

import { createBusiness } from "@/app/businesses/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionState } from "react";

export function CreateBusinessForm() {
  const [state, formAction, isPending] = useActionState(createBusiness, null);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="business-name">Business name</Label>
        <Input id="business-name" name="name" required maxLength={200} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="business-category">Category</Label>
        <Input id="business-category" name="category" placeholder="e.g. Sari-sari store" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="business-website">Website</Label>
        <Input id="business-website" name="website" type="url" placeholder="https://" />
      </div>
      {state?.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Adding..." : "Add business"}
      </Button>
    </form>
  );
}
