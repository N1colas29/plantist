import { createClient } from "@supabase/supabase-js";

const url = "https://yofqfoerwvahxffxxbtf.supabase.co";
const key = "sb_publishable_buIotMsBSB2i24bD9KTuOw_ZN6gjPBF";

export const supabase = createClient(url, key);

export async function uploadFile(file, folder, userId) {
  if (!file || !userId) return null;

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${folder}/${userId}/${crypto.randomUUID()}-${safeName}`;

  const { error } = await supabase.storage.from("plantist").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });

  if (error) throw error;

  const { data } = supabase.storage.from("plantist").getPublicUrl(path);

  return {
    url: data.publicUrl,
    path,
    filename: file.name,
    mimeType: file.type || "",
  };
}
