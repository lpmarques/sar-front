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
import {
  CroppingPatternEdit,
  CroppingPatternDetails,
  CroppingPatternsList,
 } from ".";
import { Modal, ModalProps } from "@mantine/core";
import ConfirmSubmodal from "../common/ConfirmSubmodal";

interface CroppingPatternsModalProps extends Omit<ModalProps, 'onSelect'> {
  selectedPatternId?: number;
  onSelect?: (patternId: number) => void;
  onUnselect?: () => void;
  /**
   * Invoked after a pattern is deleted, with the id of the removed pattern.
   * Callers can use this to clear cropping references in any field that
   * was using the removed pattern.
   */
  onPatternDeleted?: (patternId: number) => void;
}

type View =
  | { kind: "list" }
  | { kind: "detail"; patternId: number }
  | { kind: "create" }
  | { kind: "edit"; patternId: number; copy: boolean };

/**
 * Contents of the cropping-patterns modal.
 *
 * Holds the modal's internal view (list ↔ single-pattern detail ↔ editor) so
 * callers only ever supply a pattern id and a select/unselect callback.
 */
export default function CroppingPatternsModal({
  opened,
  selectedPatternId,
  onClose,
  onSelect,
  onUnselect,
  onPatternDeleted,
  ...modalProps
}: CroppingPatternsModalProps) {
  const [view, setView] = useState<View>(
    selectedPatternId
      ? { kind: "detail", patternId: selectedPatternId }
      : { kind: "list" }
  );
  const [cancelSubmodalOpen, setCancelSubmodalOpen] = useState(false);

  const handlePatternSelect = onSelect
    ? (patternId: number) => {
      onSelect(patternId);
    } : undefined;

  const handlePatternUnselect = onUnselect
    ? () => {
      onUnselect();
    } : undefined;

  const handlePatternDeleted = (patternId: number) => {
    onPatternDeleted?.(patternId);
    setView({ kind: "list" });
  };

  const handleClose = () => {
    setCancelSubmodalOpen(false);
    onClose();
    setView({ kind: "list" });
  };

  if (!opened)
    return undefined;

  let content = undefined;
  if (view.kind === "list")
    content = (
      <CroppingPatternsList
        selectedPatternId={selectedPatternId}
        onSelect={handlePatternSelect}
        onUnselect={handlePatternUnselect}
        onPreview={(patternId) => setView({ kind: "detail", patternId })}
        onCreate={() => setView({ kind: "create" })}
      />
    );

  if (view.kind === "detail") {
    content = (
      <CroppingPatternDetails
        patternId={view.patternId}
        onSelect={() => handlePatternSelect?.(view.patternId)}
        onBackToList={() => setView({ kind: "list" })}
        onEdit={() => setView({ kind: "edit", patternId: view.patternId, copy: false })}
        onCopy={() => setView({ kind: "edit", patternId: view.patternId, copy: true })}
        onDeleted={() => handlePatternDeleted(view.patternId)}
      />
    );
  }

  if (view.kind === "create") {
    content = (
      <CroppingPatternEdit
        onBackToList={() => setView({ kind: "list" })}
        onSaved={() => setView({ kind: "list" })}
      />
    );
  }

  if (view.kind === "edit") {
    content = (
      <CroppingPatternEdit
        patternId={view.patternId}
        copy={view.copy}
        onBackToList={() => setView({ kind: "list" })}
        onSaved={() => setView({ kind: "list" })}
      />
    );
  }

  return (
    <Modal
      opened={opened}
      onClose={["edit", "create"].includes(view.kind)
        ? () => setCancelSubmodalOpen(true)
        : handleClose
      }
      {...modalProps}
    >
      {content}
      <ConfirmSubmodal
        opened={cancelSubmodalOpen}
        onClose={() => setCancelSubmodalOpen(false)}
        onConfirm={handleClose}
        title={"Deseja descartar as mudanças?"}
        labels={{ confirm: 'Descartar mudanças', cancel: 'Cancelar' }}
        confirmProps={{ color: 'red' }}
      >
        Você está prestes a fechar o padrão sem salvar.
        Todas as alterações feitas serão perdidas.
      </ConfirmSubmodal>
    </Modal>
  );
}
