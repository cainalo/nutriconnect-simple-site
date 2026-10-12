import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nutri-Connect" },
      {
        name: "description",
        content:
          "Nutri-Connect — conectando você a uma vida mais saudável.",
      },
      { property: "og:title", content: "Nutri-Connect" },
      {
        property: "og:description",
        content:
          "Nutri-Connect — conectando você a uma vida mais saudável.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
        Nutri-Connect
      </h1>
      <p className="mt-4 max-w-md text-lg text-muted-foreground">
        Conectando você a uma vida mais saudável.
      </p>
    </div>
  );
}
