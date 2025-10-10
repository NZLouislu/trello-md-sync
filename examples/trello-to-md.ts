import { trelloToMd } from "../src";
import dotenv from "dotenv";
import path from "path";

export async function main() {
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
  const lvl = (process.env.LOG_LEVEL || "").toLowerCase();
  const json = ((process.env.LOG_JSON || "").toLowerCase() === "1") || ((process.env.LOG_JSON || "").toLowerCase() === "true");
  const logLevel = (lvl === "debug" ? "debug" : "info") as 'info'|'debug';
  const bool = (v?: string) => {
    const s = (v || "").toLowerCase();
    return s === "1" || s === "true" || s === "yes" || s === "on";
  };
  if (bool(process.env.DRY_RUN)) {
    return { written: 0 };
  }
  if (!process.env.MD_OUTPUT_DIR) {
    process.env.MD_OUTPUT_DIR = path.resolve(__dirname, "items");
  }
  const res = await trelloToMd(undefined, { logLevel, json });
  return res;
}

if (require.main === module) {
  main().then((r) => {
    console.log("trello-to-md:", r ?? "ok");
  }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}