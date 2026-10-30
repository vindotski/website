"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import {
  useForm,
  type FieldValues,
  type SubmitHandler,
  type UseFormProps,
  type UseFormReturn,
} from "react-hook-form";
import type { z } from "zod";
import { cn } from "@/lib/utils";

// Fields see the schema's raw input, onSubmit gets its parsed output.
// Generic over both rather than the schema, which inference widens to
// FieldValues
type FormProps<Input extends FieldValues, Output extends FieldValues> = {
  schema: z.ZodType<Output, Input>;
  onSubmit: SubmitHandler<Output>;
  children: (methods: UseFormReturn<Input, unknown, Output>) => ReactNode;
  options?: Omit<UseFormProps<Input, unknown, Output>, "resolver">;
  id?: string;
  className?: string;
};

export function Form<Input extends FieldValues, Output extends FieldValues>({
  schema,
  onSubmit,
  children,
  options,
  id,
  className,
}: FormProps<Input, Output>) {
  const form = useForm({
    ...options,
    resolver: zodResolver<Input, unknown, Output>(schema),
  });

  return (
    <form
      id={id}
      className={cn("flex flex-col gap-6", className)}
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
    >
      {children(form)}
    </form>
  );
}
