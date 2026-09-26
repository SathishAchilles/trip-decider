import { z } from "zod";

export const createTripSchema = z
  .object({
    // Optional: left blank, the trip is named from the group and dates.
    tripName: z.string().trim().max(80),
    organiserName: z.string().trim().min(1, "Enter your name.").max(40),
    otherNames: z
      .array(z.string().trim().min(1, "Names can't be empty.").max(40))
      .min(2, "Add at least two friends.")
      .max(11, "At most 11 friends."),
    windows: z
      .array(
        z.object({
          label: z.string().trim().min(1, "Give each date window a label.").max(40),
          startDate: z.iso.date("Pick a start date."),
          endDate: z.iso.date("Pick an end date."),
        }),
      )
      .min(1, "Add at least one date window.")
      .max(6, "At most 6 date windows."),
    deadline: z.iso.datetime({ message: "Pick when the gate closes." }),
    pin: z.string().regex(/^\d{4}$/, "Choose a 4-digit organiser PIN."),
  })
  .superRefine((value, ctx) => {
    const names = [value.organiserName, ...value.otherNames].map((n) => n.toLowerCase());
    if (new Set(names).size !== names.length) {
      ctx.addIssue({ code: "custom", message: "Every name must be different." });
    }
    if (value.windows.some((w) => w.endDate <= w.startDate)) {
      ctx.addIssue({ code: "custom", message: "Each window must end after it starts." });
    }
    const today = new Date().toISOString().slice(0, 10);
    if (value.windows.some((w) => w.startDate <= today)) {
      ctx.addIssue({ code: "custom", message: "Pick dates that haven't started yet." });
    }
    if (new Date(value.deadline) <= new Date()) {
      ctx.addIssue({ code: "custom", message: "The deadline must be in the future." });
    }
  });

export type CreateTripInput = z.input<typeof createTripSchema>;
