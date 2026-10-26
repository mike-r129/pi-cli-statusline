/**
 * Claude-Code-style statusline for Pi (mirrors ~/.claude/statusline.sh).
 *
 * Line 1: 🤖 model | 🧠 context bar | 🎯 thinking level | 📁 folder (branch)
 * Line 2: 📊 session tokens | ⚡ last-response decode speed | extension statuses
 *
 * Rate-limit and cost segments are dropped: they mean nothing for a local model.
 * Run /statusline to toggle back to Pi's default footer.
 */

import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";
import { basename } from "node:path";

const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

// Colored 10-segment bar + percentage, same thresholds as the Claude statusline.
function makeBar(pct: number): string {
	const segments = 10;
	const filled = Math.max(0, Math.min(segments, Math.round((pct * segments) / 100)));
	const color = pct < 50 ? GREEN : pct < 80 ? YELLOW : RED;
	return `${color}${"▰".repeat(filled)}${"▱".repeat(segments - filled)}${RESET} ${pct}%`;
}

const fmtTokens = (n: number) =>
	n < 1000 ? `${n}` : n < 1_000_000 ? `${(n / 1000).toFixed(1)}k` : `${(n / 1_000_000).toFixed(2)}M`;

export default function (pi: ExtensionAPI) {
	let enabled = true;
	let requestRender: (() => void) | undefined;
	// Decode speed: time from the first streamed delta to message_end, so prefill is excluded.
	let firstDeltaAt: number | undefined;
	let lastTps: number | undefined;

	const install = (ctx: ExtensionContext) => {
		ctx.ui.setFooter((tui, _theme, footerData) => {
			requestRender = () => tui.requestRender();
			const unsub = footerData.onBranchChange(() => tui.requestRender());
			return {
				dispose() {
					unsub();
					requestRender = undefined;
				},
				invalidate() {},
				render(width: number): string[] {
					const model = ctx.model?.name || ctx.model?.id || "no model";
					const usage = ctx.getContextUsage();
					const ctxPct = usage?.percent != null ? Math.round(usage.percent) : 0;
					const level = pi.getThinkingLevel();
					const effort = level === "max" ? "MAX" : level || "-";
					const branch = footerData.getGitBranch();
					const folder = basename(ctx.cwd) + (branch ? ` (${branch})` : "");

					const line1 = [`🤖 ${model}`, `🧠 ${makeBar(ctxPct)}`, `🎯 ${effort}`, `📁 ${folder}`].join(" | ");

					let input = 0;
					let output = 0;
					for (const e of ctx.sessionManager.getBranch()) {
						if (e.type === "message" && e.message.role === "assistant") {
							const m = e.message as AssistantMessage;
							input += m.usage?.input ?? 0;
							output += m.usage?.output ?? 0;
						}
					}
					const parts2 = [`📊 ↑${fmtTokens(input)} ↓${fmtTokens(output)}`];
					if (lastTps !== undefined) parts2.push(`⚡ ${lastTps.toFixed(1)} tok/s`);
					for (const status of footerData.getExtensionStatuses().values()) {
						if (status) parts2.push(status);
					}
					const line2 = DIM + parts2.join(" | ") + RESET;

					return [truncateToWidth(line1, width), truncateToWidth(line2, width)];
				},
			};
		});
	};

	pi.on("session_start", (_event, ctx) => {
		if (enabled) install(ctx);
	});

	pi.on("message_start", (event) => {
		if (event.message.role === "assistant") firstDeltaAt = undefined;
	});

	pi.on("message_update", (event) => {
		if (event.message.role === "assistant" && firstDeltaAt === undefined) firstDeltaAt = Date.now();
	});

	pi.on("message_end", (event) => {
		if (event.message.role === "assistant") {
			const out = (event.message as AssistantMessage).usage?.output ?? 0;
			const secs = firstDeltaAt !== undefined ? (Date.now() - firstDeltaAt) / 1000 : 0;
			if (out > 0 && secs > 0.2) lastTps = out / secs;
		}
		requestRender?.();
	});

	for (const ev of ["model_select", "thinking_level_select", "session_compact", "agent_end"] as const) {
		pi.on(ev, () => requestRender?.());
	}

	pi.registerCommand("statusline", {
		description: "Toggle the Claude-style statusline",
		handler: async (_args, ctx) => {
			enabled = !enabled;
			if (enabled) install(ctx);
			else ctx.ui.setFooter(undefined);
			ctx.ui.notify(enabled ? "Claude-style statusline on" : "Default footer restored", "info");
		},
	});
}
