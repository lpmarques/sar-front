/*
Simulador Agroflorestal Regenera (SAR)
Copyright (C) 2026  Lucas Marques and Regenera Mata Atlântica

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { useState } from "react";
import { modals } from "@mantine/modals";
import CroppingPatternsTable from "./CroppingPatternsTable";
import CroppingPatternPreview from "./CroppingPatternPreview";
import { CroppingPatternReadData } from "../../apis/agroforestry";

interface CroppingPatternsPreviewModalProps {
  selectedPatternId?: number;
  onSelect: (patternId: number) => void;
  onUnselect: () => void;
}

type View = { kind: "list" } | { kind: "preview"; pattern: CroppingPatternReadData };

/**
 * Contents of the cropping-patterns preview modal.
 *
 * Holds the modal's internal view (list ↔ single-pattern preview) so callers
 * only ever supply a pattern id and a select/unselect callback.
 */
export default function CroppingPatternsPreviewModal({
  selectedPatternId,
  onSelect,
  onUnselect,
}: CroppingPatternsPreviewModalProps) {
  const [view, setView] = useState<View>({ kind: "list" });

  if (view.kind === "preview") {
    return (
      <CroppingPatternPreview
        pattern={view.pattern}
        onSelect={(patternId) => {
          onSelect(patternId);
          modals.closeAll();
        }}
        onBackToList={() => setView({ kind: "list" })}
      />
    );
  }

  return (
    <CroppingPatternsTable
      selectedPatternId={selectedPatternId}
      onSelect={(patternId) => {
        onSelect(patternId);
        modals.closeAll();
      }}
      onUnselect={() => {
        onUnselect();
        modals.closeAll();
      }}
      onPreview={(pattern) => setView({ kind: "preview", pattern })}
      // onPreview={(pattern) => window.open(`/cropping-patterns/${pattern.id}`)}
    />
  );
}
