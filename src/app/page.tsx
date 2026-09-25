import { CreateTripForm } from "@/components/CreateTripForm";

export default function Home() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <span className="stamp">One link · one decision</span>
        <h1 className="font-heading text-3xl font-semibold leading-tight sm:text-4xl">
          Stop planning the trip in the group chat.
        </h1>
        <p className="text-muted-foreground">
          Everyone answers four quick questions. The app finds the options that work for the whole group and
          shows where each person stands — then the group locks one in.
        </p>
      </header>
      <CreateTripForm />
    </div>
  );
}
