import type { ProjectBlueprint } from "@ai-zoll/blueprint";

/**
 * Registers a freshly-generated project + blueprint with apps/api, when one is
 * configured (AI_ZOLL_API_URL). Silent no-op when unset — this is an opt-in
 * extra, not a core capability like the Mock/Claude AI provider choice, so
 * there's nothing worth telling every `init` run about by default.
 *
 * Never lets API failure fail `init` itself: local generation is the
 * guaranteed behavior (spec §23 — the CLI must remain usable with zero
 * dashboard/API involvement), so any network error or non-2xx response here
 * is caught, logged, and swallowed rather than thrown.
 */
export async function registerWithApi(
  blueprint: ProjectBlueprint,
): Promise<string | null> {
  const apiUrl = process.env.AI_ZOLL_API_URL;
  if (!apiUrl) {
    return null;
  }

  try {
    const projectRes = await fetch(`${apiUrl}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: blueprint.project.name }),
    });
    if (!projectRes.ok) {
      throw new Error(`POST /projects failed: ${projectRes.status}`);
    }
    const project = (await projectRes.json()) as { id: string };

    const blueprintRes = await fetch(
      `${apiUrl}/projects/${project.id}/blueprint`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blueprint),
      },
    );
    if (!blueprintRes.ok) {
      throw new Error(
        `POST /projects/${project.id}/blueprint failed: ${blueprintRes.status}`,
      );
    }

    console.error(`Registered project with the API (id: ${project.id}).`);
    return project.id;
  } catch (error) {
    console.error(
      `Could not register project with the API (continuing with local files only): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}
