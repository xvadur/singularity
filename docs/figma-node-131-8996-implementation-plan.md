# Figma Node 131-8996: Design Context + Section Implementation Plan

## Node Reference
- URL: `https://www.figma.com/design/3FvpUXSQAHjwV6Mc8MYokF/macOS-26--Community-?node-id=131-8996&p=f&t=1N3PC8OvxX8B5wUx-0`
- File key: `3FvpUXSQAHjwV6Mc8MYokF`
- Node id: `131-8996`
- Local screenshot snapshot: `docs/figma-node-131-8996-thumb.png`

## Extracted Context
- Node metadata from MCP:
  - canvas: `131:8996` (`Cover`)
  - frame: `197:2631` (`Cover`)
  - frame size: `1920x1080`
  - child: rounded rectangle `197:2632` (`Cover - UI Kit - macOS 15`)
- Visual structure (from screenshot):
  - hero-only cover frame with abstract fluid blue gradient/wave background
  - primary heading at top-left (`macOS Tahoe UI Kit`)
  - sub-brand lockup at bottom-left (`Apple Design Resources`)
  - no interactive controls in this node (pure visual cover)

## MCP Note
- `figma.get_metadata` and `figma.get_screenshot` succeeded.
- `figma.get_design_context` failed repeatedly with `nothing selected` despite provided `fileKey + nodeId`; implementation details below are derived from metadata + screenshot analysis.

## Section Breakdown for Implementation
1. `HeroCanvasBackground`
- Purpose: render smooth multi-layer gradient wave composition.
- Next implementation: CSS layered radial/linear gradients for baseline; optional WebGL/Three for animated mesh only behind content.
- Acceptance: visual tone and depth close to Figma cover without impacting readability.

2. `HeroTitleBlock`
- Purpose: top-left title group.
- Content: `macOS Tahoe` line + `UI Kit` line.
- Next implementation: large high-contrast sans headline, bold weight, generous line-height.
- Acceptance: same hierarchy and alignment as source.

3. `HeroFooterBrand`
- Purpose: bottom-left brand text row.
- Content: Apple mark + `Apple Design Resources`.
- Next implementation: text-first placeholder now, swap to official asset if extracted in later node pass.
- Acceptance: sits on lower-left safe zone, consistent spacing and color.

## Practical Migration Mapping (Jarvis Next)
1. Build this as read-only hero on Next home route first (`nextui/src/app/page.tsx` replacement stage 2).
2. Keep current parity widgets below hero while migration is active.
3. Gate any Three.js motion behind `NEXT_PUBLIC_ENABLE_THREE=1`.
4. Do not migrate capture/chat interaction surfaces using this style; keep high-clarity operational UI there.

