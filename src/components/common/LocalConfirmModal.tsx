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

import { Button, ButtonProps, getDefaultZIndex, Group, Modal, Text } from "@mantine/core";

interface LocalConfirmModalProps {
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
 *
 * The `zIndex` is bumped above the parent's level so the confirm visibly
 * stacks on top of the cropping-patterns modal (which is rendered through
 * `ModalsProvider` at `getDefaultZIndex("modal") + 1`).
 */
export default function LocalConfirmModal({
  opened,
  onClose,
  onConfirm,
  title,
  children,
  labels,
  confirmProps,
}: LocalConfirmModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      centered
      zIndex={getDefaultZIndex("modal") + 2}
    >
      <Text size="sm">{children}</Text>
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
    </Modal>
  );
}