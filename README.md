# pi-cli-statusline

An unofficial, Claude Code-style statusline for the [Pi](https://pi.dev) coding agent. It replaces Pi's footer with a compact two-line status bar.

```
🤖 Qwen3.8-Flash-Next | 🧠 ▱▱▱▱▱▱▱▱▱▱ 2% | 🎯 medium | 📁 Folder
📊 ↑22.9k ↓1.1k | 💬 12 turns | ⚡ 45.2 tok/s
```

## What it shows

| Segment | Meaning |
|---|---|
| 🤖 | Current model name. |
| 🧠 | Context-window usage as a 10-segment bar: green under 50%, yellow under 80%, red above. |
| 🎯 | Thinking level (`off` … `high`; `max` is shown as `MAX`). |
| 📁 | Working folder, plus the git branch when there is one. |
| 📊 | Input and output tokens for the current session branch. |
| 💬 | Turns: prompts you've sent in the current session branch. A cue for when to start fresh with `/new`. |
| ⚡ | Decode speed of the last response: output tokens divided by the time from first streamed token to end, so prompt processing is excluded. Handy for comparing local models. |

Status text set by other extensions (`ctx.ui.setStatus`), such as workflow progress, is appended to the second line.

It's designed for local models, so it leaves out the cost and rate-limit segments of the Claude Code statusline. Those numbers are meaningless for a model running on your own hardware.

## Install

```bash
pi install git:github.com/mike-r129/pi-cli-statusline
```

Then run `/reload` in Pi, or restart it.

To try it for one session without installing:

```bash
pi -e git:github.com/mike-r129/pi-cli-statusline
```

You can also copy `extensions/statusline.ts` into `~/.pi/agent/extensions/`.

## Usage

The statusline turns on automatically when a session starts. Run `/statusline` to switch between it and Pi's default footer.

## Requirements

- Pi 1.4.0 or newer (tested on 1.4.0 on Windows).
- A terminal and font that render emoji and the `▰▱` block characters.

## License

[MIT](LICENSE). Not affiliated with Pi, Earendil Works or Anthropic.
