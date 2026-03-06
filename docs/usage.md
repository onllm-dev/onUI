# onUI Usage Guide

## Basic Flow

1. Open the target web page.
2. Open the extension popup.
3. Toggle `This Tab` on.
4. Use the floating onUI launcher to open the toolbar.
5. Choose one annotation path:
   1. **Element annotation path**
      1. Toggle **Annotate mode**.
      2. Click an element to open the element dialog.
      3. Add comment/intent/severity and save.
   2. **Region draw path**
      1. Toggle **Draw mode**.
      2. Choose shape: **rectangle** or **ellipse**.
      3. Drag on the page to define region geometry.
      4. Release pointer to open the region dialog.
      5. Add comment/intent/severity and save.
6. Optionally open **Settings** from the toolbar to choose output level and toggle **Clear on copy**.
7. Copy output from the toolbar when needed.

## Annotation Dialog

Each annotation supports:
- comment
- intent (`fix`, `change`, `question`, `approve`)
- severity (`blocking`, `important`, `suggestion`)

## Multi-Element Batch Annotation

1. Toggle **Annotate mode**.
2. Hold `Shift` and click elements to add/remove them from the pending batch.
3. Release `Shift` to open one dialog for the current connected targets.
4. Optionally remove targets in the dialog before save.
5. Save to create one annotation per selected element with shared batch metadata.
6. Keep batch size at or below 25 elements.

## Region Editing

1. Click an existing region marker/outline to open it in edit mode.
2. Move the region by dragging inside the transform box.
3. Resize using the eight handles (`nw`, `n`, `ne`, `e`, `se`, `s`, `sw`, `w`).
4. Save to persist updated geometry with the annotation comment/intent/severity.
5. Use Delete in the region dialog to remove the region annotation.

## Interaction Behavior (Shift, Draw, Escape)

1. `Shift` multi-select applies to **element selection flow**.
2. Draw mode is exclusive with annotate mode; enabling draw mode exits annotate mode.
3. `Escape` behavior is state-based:
   1. During active draw draft: cancel current draft.
   2. With pending drawn region dialog: close pending region.
   3. In draw mode (idle): exit draw mode.
   4. While editing region transform geometry: clear transform edit state.
   5. During pending Shift multi-select (before dialog): clear pending selection.
   6. In annotate mode with no higher-priority state: exit annotate mode.

## Toolbar Settings (Compact Pop-out)

1. The floating toolbar remains compact by default.
2. Click the **Settings** icon to open the pop-out settings card.
3. Use **Output level** to switch between `compact`, `standard`, `detailed`, and `forensic` export formats.
4. Use **Clear on copy** to automatically clear annotations after a successful copy action.

## Export and Report Output for Region Annotations

1. Region annotations are exported with `targetType` = `region` and include:
   1. `shape` (`rectangle` or `ellipse`)
   2. `geometry` (`x`, `y`, `width`, `height`, coordinate space)
2. Output-level implications:
   1. **compact**: includes inline region shape + geometry summary.
   2. **standard**: includes target type, shape, and geometry fields.
   3. **detailed**: includes target type/shape/geometry plus compatibility selector/tag/path fields.
   4. **forensic**: includes region identification fields and region geometry in target identification.
3. Region edits update geometry used in subsequent report/export output.

## Notes

- onUI is tab-scoped: enabling one tab does not enable others.
- New tabs start with onUI off.
- Restricted browser pages (for example `chrome://`, `edge://`, or `about:`) are unsupported.
