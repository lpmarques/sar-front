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

import { Button, ButtonProps, Group, Text } from "@mantine/core";
import Submodal from "./Submodal";

interface ConfirmSubmodalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  labels: {
    confirm: string;
    cancel: string;
  };
  confirmProps: ButtonProps | undefined;
}

/**
 * A confirmation `Modal` mounted inside the caller's own component tree,
 * instead of being pushed into the global `@mantine/modals` registry.
 *
 * Use this whenever you need a confirmation inside another already-rendered
 * modal: the global registry only renders the topmost entry at any time,
 * which would unmount the parent modal's children and reset their
 * `useState`. A local `Modal` overlays the parent without unmounting it.
 */
export default function ConfirmSubmodal({
  opened,
  onClose,
  onConfirm,
  title,
  children,
  labels,
  confirmProps,
}: ConfirmSubmodalProps) {
  return (
    <Submodal opened={opened} onClose={onClose} title={title}>
      {children}
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onClose}>
          {labels.cancel}
        </Button>
        <Button
          {...(confirmProps ?? {})}
          onClick={() => {
            onClose();
            onConfirm();
          }}
        >
          {labels.confirm}
        </Button>
      </Group>
    </Submodal>
  );
}
