import { Folder, Prompt, Generation } from "../types";

const API_BASE = "/api";

export const api = {
  async getFolders(): Promise<Folder[]> {
    const res = await fetch(`${API_BASE}/folders`);
    return res.json();
  },
  async createFolder(name: string, parent_id: number | null): Promise<Folder> {
    const res = await fetch(`${API_BASE}/folders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parent_id }),
    });
    return res.json();
  },
  async deleteFolder(id: number): Promise<void> {
    await fetch(`${API_BASE}/folders/${id}`, { method: "DELETE" });
  },
  async getPrompts(): Promise<Prompt[]> {
    const res = await fetch(`${API_BASE}/prompts`);
    return res.json();
  },
  async createPrompt(formData: FormData): Promise<{ id: number }> {
    const res = await fetch(`${API_BASE}/prompts`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      let errorMessage = 'Failed to create prompt';
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const error = await res.json();
        errorMessage = error.error || errorMessage;
      } else {
        const text = await res.text();
        console.error('Server returned non-JSON error:', text);
        // If it's HTML, we don't want to show the whole thing to the user
        if (text.includes('<!DOCTYPE html>') || text.includes('<!doctype html>')) {
          errorMessage = `Server Error (${res.status}): The server returned an HTML page instead of JSON. Check server logs.`;
        } else {
          errorMessage = text || errorMessage;
        }
      }
      throw new Error(errorMessage);
    }
    return res.json();
  },
  async updatePrompt(id: number, formData: FormData): Promise<void> {
    const res = await fetch(`${API_BASE}/prompts/${id}`, {
      method: "PUT",
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to update prompt');
  },
  async deletePrompt(id: number): Promise<void> {
    await fetch(`${API_BASE}/prompts/${id}`, { method: "DELETE" });
  },
  async getGenerations(): Promise<Generation[]> {
    const res = await fetch(`${API_BASE}/generations`);
    return res.json();
  },
  async saveGeneration(prompt_id: number, image_data: string, params: any): Promise<{ id: number, image_path: string, thumbnail_path: string }> {
    const res = await fetch(`${API_BASE}/generations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt_id, image_data, params }),
    });
    return res.json();
  },
  async deleteGeneration(id: number): Promise<void> {
    await fetch(`${API_BASE}/generations/${id}`, { method: "DELETE" });
  },
  async toggleFavorite(id: number, is_favorite: boolean): Promise<void> {
    await fetch(`${API_BASE}/prompts/${id}/favorite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_favorite }),
    });
  },
  async reorderPrompts(promptIds: number[]): Promise<void> {
    await fetch(`${API_BASE}/prompts/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promptIds }),
    });
  },
};
