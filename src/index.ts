#!/usr/bin/env node
import dotenv from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { MeshyClient } from "./client.js";

dotenv.config();

const apiKey = process.env.MESHY_API_KEY;
if (!apiKey) {
  throw new Error("MESHY_API_KEY environment variable is not set");
}

const apiBase = process.env.MESHY_API_BASE;
const parsedStreamTimeout = process.env.MESHY_STREAM_TIMEOUT
  ? Number.parseInt(process.env.MESHY_STREAM_TIMEOUT, 10)
  : undefined;
const streamTimeout = Number.isFinite(parsedStreamTimeout) ? parsedStreamTimeout : undefined;

const client = new MeshyClient(apiKey, { apiBase, streamTimeout });

const server = new McpServer(
  {
    name: "Meshy AI MCP Server (Node)",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
);

const jsonResponse = (payload: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: JSON.stringify(payload, null, 2),
    },
  ],
});

// Text to 3D endpoints

server.registerTool(
  "create_text_to_3d_preview_task",
  {
    description: "Generate a mesh-only 3D model from a text prompt.",
    inputSchema: z.object({
      mode: z.literal("preview"),
      prompt: z.string().max(600),
      model_type: z.enum(["standard", "lowpoly"]).optional(),
      ai_model: z.enum(["latest", "meshy-6", "meshy-5"]).optional(),
      topology: z.enum(["triangle", "quad"]).optional(),
      target_polycount: z.number().int().min(100).max(300000).optional(),
      should_remesh: z.boolean().optional(),
      symmetry_mode: z.enum(["auto", "off", "on"]).optional(),
      pose_mode: z.enum(["", "a-pose", "t-pose"]).optional(),
      moderation: z.boolean().optional(),
      target_formats: z.array(z.enum(["glb", "obj", "fbx", "stl", "usdz"])).optional(),
    }),
  },
  async (args) => jsonResponse(await client.post("/v2/text-to-3d", args)),
);

server.registerTool(
  "create_text_to_3d_refine_task",
  {
    description: "Refine a 3D model from a preview task, adding textures and optionally PBR materials.",
    inputSchema: z.object({
      mode: z.literal("refine"),
      preview_task_id: z.string(),
      enable_pbr: z.boolean().optional(),
      texture_prompt: z.string().max(600).optional(),
      texture_image_url: z.string().optional(),
      ai_model: z.enum(["latest", "meshy-6", "meshy-5"]).optional(),
      moderation: z.boolean().optional(),
      remove_lighting: z.boolean().optional(),
      target_formats: z.array(z.enum(["glb", "obj", "fbx", "stl", "usdz"])).optional(),
    }),
  },
  async (args) => jsonResponse(await client.post("/v2/text-to-3d", args)),
);

server.registerTool(
  "retrieve_text_to_3d_task",
  {
    description: "Retrieve the status and result of a text-to-3d task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.get(`/v2/text-to-3d/${task_id}`)),
);

server.registerTool(
  "delete_text_to_3d_task",
  {
    description: "Delete a text-to-3d task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.delete(`/v2/text-to-3d/${task_id}`)),
);

server.registerTool(
  "list_text_to_3d_tasks",
  {
    description: "List previously created text-to-3d tasks.",
    inputSchema: z.object({
      page_num: z.number().int().min(1).optional(),
      page_size: z.number().int().min(1).max(50).optional(),
      sort_by: z.enum(["+created_at", "-created_at"]).optional(),
    }),
  },
  async (args = {}) => jsonResponse(await client.get("/v2/text-to-3d", { query: args })),
);

server.registerTool(
  "stream_text_to_3d_task",
  {
    description: "Stream updates for a text-to-3d task until it completes.",
    inputSchema: z.object({
      task_id: z.string(),
      timeout: z.number().int().optional().describe("Stream timeout in seconds"),
    }),
  },
  async ({ task_id, timeout }) => jsonResponse(await client.stream(`/v2/text-to-3d/${task_id}/stream`, timeout)),
);

// Image to 3D endpoints

server.registerTool(
  "create_image_to_3d_task",
  {
    description: "Generate a 3D model from an input image and optional prompt.",
    inputSchema: z.object({
      image_url: z.string(),
      model_type: z.enum(["standard", "lowpoly"]).optional(),
      ai_model: z.enum(["latest", "meshy-6", "meshy-5"]).optional(),
      topology: z.enum(["triangle", "quad"]).optional(),
      target_polycount: z.number().int().min(100).max(300000).optional(),
      save_pre_remeshed_model: z.boolean().optional(),
      should_remesh: z.boolean().optional(),
      should_texture: z.boolean().optional(),
      enable_pbr: z.boolean().optional(),
      pose_mode: z.enum(["", "a-pose", "t-pose"]).optional(),
      symmetry_mode: z.enum(["auto", "off", "on"]).optional(),
      texture_prompt: z.string().max(600).optional(),
      texture_image_url: z.string().optional(),
      moderation: z.boolean().optional(),
      image_enhancement: z.boolean().optional(),
      remove_lighting: z.boolean().optional(),
      target_formats: z.array(z.enum(["glb", "obj", "fbx", "stl", "usdz"])).optional(),
    }),
  },
  async (args) => jsonResponse(await client.post("/v1/image-to-3d", args)),
);

server.registerTool(
  "retrieve_image_to_3d_task",
  {
    description: "Retrieve the status and result of an image-to-3d task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.get(`/v1/image-to-3d/${task_id}`)),
);

server.registerTool(
  "delete_image_to_3d_task",
  {
    description: "Delete an image-to-3d task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.delete(`/v1/image-to-3d/${task_id}`)),
);

server.registerTool(
  "list_image_to_3d_tasks",
  {
    description: "List previously created image-to-3d tasks.",
    inputSchema: z.object({
      page_num: z.number().int().min(1).optional(),
      page_size: z.number().int().min(1).max(50).optional(),
      sort_by: z.enum(["+created_at", "-created_at"]).optional(),
    }),
  },
  async (args = {}) => jsonResponse(await client.get("/v1/image-to-3d", { query: args })),
);

server.registerTool(
  "stream_image_to_3d_task",
  {
    description: "Stream updates for an image-to-3d task.",
    inputSchema: z.object({
      task_id: z.string(),
      timeout: z.number().int().optional().describe("Stream timeout in seconds"),
    }),
  },
  async ({ task_id, timeout }) => jsonResponse(await client.stream(`/v1/image-to-3d/${task_id}/stream`, timeout)),
);

// Remesh endpoints

server.registerTool(
  "create_remesh_task",
  {
    description: "Remesh and optimize an existing 3D model.",
    inputSchema: z.object({
      input_task_id: z.string().optional(),
      model_url: z.string().optional(),
      target_formats: z.array(z.enum(["glb", "fbx", "obj", "usdz", "blend", "stl"])).optional(),
      topology: z.enum(["triangle", "quad"]).optional(),
      target_polycount: z.number().int().min(100).max(300000).optional(),
      resize_height: z.number().optional(),
      origin_at: z.enum(["bottom", "center"]).optional(),
      convert_format_only: z.boolean().optional(),
    }),
  },
  async (args) => jsonResponse(await client.post("/v1/remesh", args)),
);

server.registerTool(
  "retrieve_remesh_task",
  {
    description: "Retrieve the status and result of a remesh task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.get(`/v1/remesh/${task_id}`)),
);

server.registerTool(
  "delete_remesh_task",
  {
    description: "Delete a remesh task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.delete(`/v1/remesh/${task_id}`)),
);

server.registerTool(
  "list_remesh_tasks",
  {
    description: "List previously created remesh tasks.",
    inputSchema: z.object({
      page_num: z.number().int().min(1).optional(),
      page_size: z.number().int().min(1).max(50).optional(),
      sort_by: z.enum(["+created_at", "-created_at"]).optional(),
    }),
  },
  async (args = {}) => jsonResponse(await client.get("/v1/remesh", { query: args })),
);

server.registerTool(
  "stream_remesh_task",
  {
    description: "Stream updates for a remesh task.",
    inputSchema: z.object({
      task_id: z.string(),
      timeout: z.number().int().optional().describe("Stream timeout in seconds"),
    }),
  },
  async ({ task_id, timeout }) => jsonResponse(await client.stream(`/v1/remesh/${task_id}/stream`, timeout)),
);

// Rigging endpoints

server.registerTool(
  "create_rigging_task",
  {
    description: "Create a rigging job for a humanoid 3D model. Upon successful completion, it provides a rigged character in standard formats and optionally basic walking/running animations.",
    inputSchema: z.object({
      input_task_id: z.string().optional(),
      model_url: z.string().optional(),
      height_meters: z.number().positive().optional(),
      texture_image_url: z.string().optional(),
    }),
  },
  async (request) => jsonResponse(await client.post("/v1/rigging", request)),
);

server.registerTool(
  "retrieve_rigging_task",
  {
    description: "Retrieve the status of a rigging task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.get(`/v1/rigging/${task_id}`)),
);

server.registerTool(
  "delete_rigging_task",
  {
    description: "Delete a rigging task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.delete(`/v1/rigging/${task_id}`)),
);

server.registerTool(
  "stream_rigging_task",
  {
    description: "Stream updates for a rigging task until it completes.",
    inputSchema: z.object({
      task_id: z.string(),
      timeout: z.number().int().optional().describe("Stream timeout in seconds"),
    }),
  },
  async ({ task_id, timeout }) => jsonResponse(await client.stream(`/v1/rigging/${task_id}/stream`, timeout)),
);

// Animation endpoints

server.registerTool(
  "create_animation_task",
  {
    description:
      "Create an animation task for a rigged model. The payload must include an action_id from the Meshy animation library.",
    inputSchema: z.object({
      rig_task_id: z.string(),
      action_id: z.number().int(),
      post_process: z.object({
        operation_type: z.enum(["change_fps", "fbx2usdz", "extract_armature"]),
        fps: z.union([z.literal(24), z.literal(25), z.literal(30), z.literal(60)]).optional(),
      }).optional(),
    }),
  },
  async (request) => jsonResponse(await client.post("/v1/animations", request)),
);

server.registerTool(
  "retrieve_animation_task",
  {
    description: "Retrieve the status or result of an animation task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.get(`/v1/animations/${task_id}`)),
);

server.registerTool(
  "delete_animation_task",
  {
    description: "Delete an animation task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.delete(`/v1/animations/${task_id}`)),
);

server.registerTool(
  "stream_animation_task",
  {
    description: "Stream updates for an animation task using server-sent events.",
    inputSchema: z.object({
      task_id: z.string(),
      timeout: z.number().int().optional().describe("Stream timeout in seconds"),
    }),
  },
  async ({ task_id, timeout }) => jsonResponse(await client.stream(`/v1/animations/${task_id}/stream`, timeout)),
);

// Retexture endpoints

server.registerTool(
  "create_retexture_task",
  {
    description: "Apply textures to a 3D model using text prompts.",
    inputSchema: z.object({
      input_task_id: z.string().optional(),
      model_url: z.string().optional(),
      text_style_prompt: z.string().max(600).optional(),
      image_style_url: z.string().optional(),
      ai_model: z.enum(["latest", "meshy-6", "meshy-5"]).optional(),
      enable_original_uv: z.boolean().optional(),
      enable_pbr: z.boolean().optional(),
      remove_lighting: z.boolean().optional(),
      target_formats: z.array(z.enum(["glb", "obj", "fbx", "stl", "usdz"])).optional(),
    }),
  },
  async (args) => jsonResponse(await client.post("/v1/retexture", args)),
);

server.registerTool(
  "retrieve_retexture_task",
  {
    description: "Retrieve the status and result of a retexture task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.get(`/v1/retexture/${task_id}`)),
);

server.registerTool(
  "delete_retexture_task",
  {
    description: "Delete a retexture task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.delete(`/v1/retexture/${task_id}`)),
);

server.registerTool(
  "list_retexture_tasks",
  {
    description: "List previously created retexture tasks.",
    inputSchema: z.object({
      page_num: z.number().int().min(1).optional(),
      page_size: z.number().int().min(1).max(50).optional(),
      sort_by: z.enum(["+created_at", "-created_at"]).optional(),
    }),
  },
  async (args = {}) => jsonResponse(await client.get("/v1/retexture", { query: args })),
);

server.registerTool(
  "stream_retexture_task",
  {
    description: "Stream updates for a retexture task.",
    inputSchema: z.object({
      task_id: z.string(),
      timeout: z.number().int().optional().describe("Stream timeout in seconds"),
    }),
  },
  async ({ task_id, timeout }) => jsonResponse(await client.stream(`/v1/retexture/${task_id}/stream`, timeout)),
);

// Balance endpoints

server.registerTool(
  "get_balance",
  {
    description: "Retrieve your Meshy AI account balance.",
  },
  async () => jsonResponse(await client.get("/v1/balance")),
);

const transport = new StdioServerTransport();
await server.connect(transport);
