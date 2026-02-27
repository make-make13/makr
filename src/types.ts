export interface Folder {
  id: number;
  name: string;
  parent_id: number | null;
}

export interface PromptVariable {
  start: number;
  end: number;
  text: string;
}

export interface Prompt {
  id: number;
  title: string;
  text: string;
  variables: PromptVariable[];
  image_path: string | null;
  bg_color: string | null;
  overlay_text: string | null;
  folder_id: number | null;
  is_fast_prompt: boolean;
  is_favorite: boolean;
  sort_order: number;
  created_at: string;
  tags: string[];
}

export interface Generation {
  id: number;
  prompt_id: number;
  image_path: string;
  thumbnail_path: string | null;
  params: any;
  created_at: string;
}

export const PRESET_COLORS = [
  "#F87171", "#FB923C", "#FBBF24", "#FACC15", "#A3E635",
  "#4ADE80", "#34D399", "#2DD4BF", "#22D3EE", "#38BDF8",
  "#60A5FA", "#818CF8", "#A78BFA", "#C084FC", "#E879F9",
  "#F472B6", "#FB7185", "#94A3B8", "#A1A1AA", "#A8A29E"
];

export interface GenParams {
  size: string;
  orientation: string;
  model: string;
  style: string;
  prompt_strength: number;
  negative_prompt: string;
  seed: string;
  guidance_scale: number;
  steps: number;
  aspect_ratio: string;
  face_enhance: boolean;
  upscale: string;
  sampler: string;
  controlnet: string;
}

export const DEFAULT_PARAMS: GenParams = {
  size: "1024x1024",
  orientation: "square",
  model: "realistic",
  style: "realistic",
  prompt_strength: 1.0,
  negative_prompt: "blurry, low quality",
  seed: "random",
  guidance_scale: 7.5,
  steps: 30,
  aspect_ratio: "1:1",
  face_enhance: true,
  upscale: "1x",
  sampler: "euler_a",
  controlnet: "none"
};
