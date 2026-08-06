CroppingPatternPreview does moderately complex spatial computation and visual refinements to graphically represent a preview for a multi-plant cropping, based on a defined cropping pattern data structure. Now, I need to create a new component to allow editing cropping patterns or creating new ones. I intend to make it structurally similar to CroppingPatternPreview, with the following visual and functional differences:

# PatternFormPanel
A new subcomponent to replace the PatternInfoPanel;
- Must contain a text input field for the pattern name and another one for the description;

# RowInputPanel
A new subcomponent to replace the RowInfoPanel;
- Must contain a dropdown for displaying/setting the selected row's purpose (purposeId);
- It should also list the sequence of crops in that row, just as RowInfoPanel does;
- Should offer a delete button (use ../common/DeleteButton) to enable the user to remove the selected row from pattern.

# CropInputPanel
A new subcomponent to replace the PlantInfoPanel;
- Besides displaying the same infos as PlantInfoPanel for the current plant in the selected position, this panel must also allow changing/choosing a plant from a dropdown list containing all the plants in catalog;
- The plants in dropdown should be ranked by fitness score;
- Everytime a different plant is selected, the preview panel should be automatically re-rendered to reflect that change.
- Should offer a delete button (use ../common/DeleteButton) to enable the user to remove the selected crop from pattern.

# SpacingInputPanel
This new panel should be rendered when any spacing label is clicked;
- Must dispose of a number input field for setting the length of the selected label's spacing;
- Everytime the length input field loses focus with a changed value, the preview panel should be automatically re-rendered to reflect that change.

# PatternPreviewPanel-equivalent
Since the original PatternPreviewPanel and its auxiliary subcomponents and functions (RowGeometry, buildPreviewGeometry, renderRows, etc) already contain most of the logic for rendering the preview, I wonder if we should extract and refactor this same component to offer two different usage modes, such as "read-only" and "write" (subjecting the changes below to the write mode), or rather actually create a new equivalent component replicating some of the common rendering logic but with changes to meet the pattern edit/create requirements. Whatever is the best option, consider the following as such requirements;
- Repetitions:
  - Just as the original PatternPreviewPanel, the new panel should have a control for showing/hiding repetitions of the pattern's elements (isRep === true), but here, by default, it should hide reps.
- Crops:
  - When a crop is clicked, only the crop in that specific position should be selected and "highlighted", rather than all crops with the same plant;
  - When mousing over any of the repeated (isRep === true) crops at the bottom of a row on the preview, they should give place to a single circle (white, with a plus icon within it), at the end of that row. When clicked, the circle must open the CropInputPanel to define a new plant for that position;
  - Regarding new crop creation:
    - After a circle-with-plus-icon is selected and until the first crop's plant is selected from CropInputPanel, the preview panel must display a single dashed white circle at that position, representing the to-be-set crop;
    - If any other element in the preview is selected before a plant is picked, the new crop must unmount;
    - When a plant is finally picked, the corresponding crop must be inserted in the pattern form, and the preview must be re-rendered to reflect the change.
- Crop spacings:
  - Just as in the regular PatternPreviewPanel, vertical spacing lines beteeen a non-rep (isRep === false) crop and any other must always display the spacing length label at its left side.
  - But here, when hovered, the area around this line should also:
    - Render a diamond shape around the spacing label. When clicked, the shape must open the SpacingInputPanel for that spacing, so that the user may change its length;
    - Render, at the right side of the line (aligned with the spacing label), a circle with a plus icon within. When clicked, this circle must display the CropInputPanel, allowing to set a new crop for that position (inserted between the two crops separated by that spacing);
    - Both the diamond shape and the circle must be white and have similar diameters, to keep proportional.
  - The spacings between any newly added crop and the neighbouring one(s) should be, by default:
    - 1m to the next one, if it is the first crop in the row;
    - 1m to the next one and the same spacing from the previous one (above it), if it is the last crop in the row;
    - the original spacing between its two neighbors divided by 2, otherwise.
- Row start offsets:
  - Must have the same appearance as in original PatternPreviewPanel and the same behavior as crop spacings in the new component (described above), with few exceptions:
    - When hovering the area around the line, the length label at its left side should display a white triangle (pointing down) around it, rather than a diamond shape. The height of this triangle should match the diameter of the diamond shapes from crop spacings.
    - After clicking the circle-with-plus-icon at the right side of the line and selecting a plant on the CropInputPanel:
      - The plant should be appended to the row as its new first crop, "shifting down" the remaining crops of that row;
      - The start offset line must be kept with the same length on the top;
      - The spacing between the new first crop and the now second one must be 1m by default.
- Rows:
  - At both sides of each row's label, two arrow icons should be permanently displayed:
    - The right-side arrow must point to the right and the left one to the left;
    - When clicked, the row's position should change accordingly: left arrow makes the row switch positions with the neighboring row at its left side and the right arrow makes it switch with the right neighbor. The rows' position numbers (and labels) should also change accordingly.
  - If a row currently has no start offset (cropsOffsetM === 0), then when mousing over the area between the row's label and its first crop, a clickable white triangle (pointing down) should be displayed on that area. On click, the triangle must open the SpacingInputPanel (or equivalent component), allowing the user to set a start offset for that row;
  - When mousing over any of the repeated (isRep === true) rows on the pattern preview, they should all give place to a single circle (white, with a plus icon within it), at the end of the pattern. When clicked, the circle would open the CropInputPanel to define a plant as the first crop of a new row at that position;
  - When hovering the area between the label and the first crop, always display a circle-with-plus-icon. When the triangle should also appear, render them as an aligned group, side by side: triangle on the left, circle on the right, both justified with row label and first crop. When clicked, this circle must have the same behavior as the one from the start offset line.
  - Regarding new row creation:
    - After the circle-with-plus-icon is selected and until the first crop's plant is selected from CropInputPanel, the preview panel must display a new row at that position, represented at first only by:
      - The new row's label ("Linha {position}");
      - A single dashed white circle at the row start, representing the to-be-set first crop;
    - If any other element in the preview is selected before a plant is picked, the new row must unmount;
    - When a plant is finally picked, the corresponding single-crop row must be inserted in the pattern form, and the preview must be re-rendered to reflect the change.
- Row spacings:
  - Just as in the regular PatternPreviewPanel, horizontal spacing lines beteeen a non-rep (isRep === false) row and any other must always display the spacing length label above it.
  - But here, when hovered, the area around this line should also:
    - Render a diamond shape around the spacing label. When clicked, the shape must open the SpacingInputPanel for that spacing, so that the user may change its length;
    - Render, below the line (justified with the spacing label), a circle with a plus icon within. When clicked, this circle must display the CropInputPanel to allow setting the first crop of a new row.
    - Both the diamond shape and the circle must be white and have similar diameters, to keep proportional.
  - The spacings between any newly added row and the neighbouring one(s) should be, by default:
    - 1m to the next one and the same spacing from the previous one (at its left), if it is a terminal row (last in the pattern);
    - the original spacing between its two neighbors divided by 2, otherwise.
- New pattern:
  - If an entirely new pattern is being created, at first we should display:
    - the preview panel with a single row, labeled "Linha 1", and a single dashed white circle, representing the to-be-set first crop, just like any new row would look like;
    - the CropInputPanel to allow picking a plant for this first crop position.

# Extra
- All of the panels described above should share a mantine form called patternForm and accept it as a prop:
  - Any change to input fields in each panel should trigger a change in the equivalent values of that form;
  - If editing a pre-existent pattern, the form should have the latest pattern data as initial values;
- Finally, a button labeled "Salvar", at the bottom of the modal, should handle the pattern saving:
  - When clicked, it must validate:
    - That a unique name has been chosen for that pattern;
    - That the pattern contains at least one row;
    - That every row contains at least one defined crop;
  - If validation passes, it should: 
    - Feed the form values into a CroppingPatternWriteRequestData object;
    - Use the object to create the new pattern (via tanstack mutation using agroforestry api's createCroppingPattern) or update if pre-existent (using updateCroppingPattern);
    - Refetch and re-render the patterns table;
- An additional button called "Cancelar" should otherwise directly refetch and display the patterns list when clicked, discarding all the changes made. It may first open a smaller overlaying modal to confirm that decision.
