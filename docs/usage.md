# onUI Usage Guide

## Basic Flow

1. Open the target web page.
2. Open the extension popup.
3. Toggle `This Tab` on.
4. Use the floating onUI launcher to start annotating.
5. Click normally to annotate a single element.
6. Hold `Shift` and click multiple elements to build a batch selection.
7. Release `Shift` to open one dialog for all selected targets.
8. Save notes and copy output when needed.

## Annotation Dialog

Each annotation supports:
- comment
- intent (`fix`, `change`, `question`, `approve`)
- severity (`blocking`, `important`, `suggestion`)

## Multi-Element Batch Annotation

- Hold `Shift` and click to toggle elements in or out of the current batch.
- Releasing `Shift` opens a single dialog with the full selected target list.
- Removing targets in the dialog updates the batch before save.
- Saving creates one annotation per selected element with shared internal batch metadata.
- Batch selection is capped at 25 elements.

## Notes

- onUI is tab-scoped: enabling one tab does not enable others.
- New tabs start with onUI off.
- Restricted browser pages (for example `chrome://`) are unsupported.
