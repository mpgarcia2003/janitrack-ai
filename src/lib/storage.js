import { supabase } from "@/lib/supabase";

const BUCKET = "uploads";

const slugifyFileName = (name) =>
  name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);

/**
 * Upload a file to Supabase Storage and return its public URL.
 * Replaces the old `base44.integrations.Core.UploadFile` call.
 *
 * @param {{ file: File, folder?: string }} args
 * @returns {Promise<{ file_url: string, path: string }>}
 */
export async function uploadFile({ file, folder = "misc" }) {
  if (!file) throw new Error("uploadFile: no file provided");

  const safeName = slugifyFileName(file.name ?? "upload");
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { file_url: publicUrl?.publicUrl, path };
}
