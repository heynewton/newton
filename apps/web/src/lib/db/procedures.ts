import "server-only";
import { prepareProcedureChunks, VoyageEmbedder, type Embedder } from "@newton/indexing";
import { createClient } from "./client";
import { getMyBoat, type Person } from "./index";

export const PROCEDURE_TITLE_MAX_LENGTH = 120;
export const PROCEDURE_CONTENT_MAX_LENGTH = 12_000;

export type BoatProcedure = {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
};

export async function getBoatProcedures(boatId: string): Promise<BoatProcedure[]> {
  const supabase = await createClient();
  if (!supabase) throw new Error("No database configured");
  const { data, error } = await supabase
    .from("boat_procedures")
    .select("id, title, content, updated_at")
    .eq("boat_id", boatId)
    .order("title");
  if (error) throw new Error(`Could not load the boat's procedures: ${error.message}`);
  return data.map((procedure) => ({
    id: procedure.id,
    title: procedure.title,
    content: procedure.content,
    updatedAt: procedure.updated_at,
  }));
}

export type SaveBoatProcedureResult =
  | { ok: true; procedureId: string }
  | { ok: false; reason: "invalid_title" | "invalid_content" | "not_allowed" | "indexing_unavailable" | "failed" };

export async function saveBoatProcedure(
  person: Person,
  boatId: string,
  procedureId: string | null,
  title: string,
  content: string,
  embedder?: Embedder,
): Promise<SaveBoatProcedureResult> {
  const cleanTitle = title.trim();
  const cleanContent = content.trim();
  if (!cleanTitle || cleanTitle.length > PROCEDURE_TITLE_MAX_LENGTH) return { ok: false, reason: "invalid_title" };
  if (!cleanContent || cleanContent.length > PROCEDURE_CONTENT_MAX_LENGTH) return { ok: false, reason: "invalid_content" };

  const boat = await getMyBoat(person, boatId);
  if (!boat || (boat.role !== "owner" && boat.role !== "co_owner") || boat.deletingSince) {
    return { ok: false, reason: "not_allowed" };
  }
  if (!embedder && !process.env.VOYAGE_API_KEY) return { ok: false, reason: "indexing_unavailable" };

  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "failed" };

  const indexedAs = {
    id: procedureId ?? crypto.randomUUID(),
    boatId: boat.boatId,
    title: cleanTitle,
    updatedAt: new Date().toISOString(),
  };
  try {
    const chunks = await prepareProcedureChunks(indexedAs, cleanContent, embedder ?? new VoyageEmbedder());
    const { data, error } = await supabase.rpc("save_boat_procedure", {
      target_boat_id: boat.boatId,
      target_procedure_id: procedureId,
      procedure_title: cleanTitle,
      procedure_content: cleanContent,
      chunks_to_store: chunks.map((chunk) => ({
        chunk_index: chunk.chunkIndex,
        content: chunk.content,
        embedding: `[${chunk.embedding.join(",")}]`,
        embedding_model: chunk.embeddingModel,
      })),
    });
    if (error) {
      if (error.code === "42501") return { ok: false, reason: "not_allowed" };
      if (error.code === "22023" || error.code === "23514") return { ok: false, reason: "invalid_content" };
      console.error("procedures: save failed", error.message);
      return { ok: false, reason: "failed" };
    }
    return { ok: true, procedureId: data };
  } catch (error) {
    console.error("procedures: indexing failed", error instanceof Error ? error.message : error);
    return { ok: false, reason: "failed" };
  }
}

export type DeleteBoatProcedureResult = { ok: true } | { ok: false; reason: "not_allowed" | "failed" };

export async function deleteBoatProcedure(
  person: Person,
  boatId: string,
  procedureId: string,
): Promise<DeleteBoatProcedureResult> {
  const boat = await getMyBoat(person, boatId);
  if (!boat || (boat.role !== "owner" && boat.role !== "co_owner") || boat.deletingSince) {
    return { ok: false, reason: "not_allowed" };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "failed" };
  const { data, error } = await supabase
    .from("boat_procedures")
    .delete()
    .eq("boat_id", boat.boatId)
    .eq("id", procedureId)
    .select("id");
  if (error) {
    console.error("procedures: delete failed", error.message);
    return { ok: false, reason: "failed" };
  }
  return data.length === 1 ? { ok: true } : { ok: false, reason: "not_allowed" };
}
