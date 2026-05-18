"use server";

import { searchAll, type SearchResults } from "@/lib/data";

export async function globalSearch(query: string): Promise<SearchResults> {
  return searchAll(query);
}
