/*
Simulador Agroflorestal Regenera (SAR)
Copyright (C) 2026  Lucas Marques and Regenera Mata Atlântica

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

import { useState } from "react";
import { Button, ButtonProps } from "@mantine/core";
import { modals } from "@mantine/modals";
import LocalConfirmModal from "./LocalConfirmModal";

export interface ConfirmModalProps {
  title: string;
  children: React.ReactNode;
  labels: {
    confirm: string;
    cancel: string;
  };
  confirmProps: (ButtonProps & Omit<React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>, "ref"> & Record<`data-${string}`, any>) | undefined;
  onConfirm: () => void;
}

interface ConfirmingButtonProps extends Omit<ButtonProps, 'onClick'> {
  children: React.ReactNode;
  modal: ConfirmModalProps;
  /**
   * When `true`, the confirmation is rendered as a `LocalConfirmModal` mounted
   * inside the button's own component tree, instead of being pushed into the
   * global `@mantine/modals` registry. Use this from inside another modal:
   * the global registry only renders the topmost entry, which would unmount
   * the parent modal's children and reset their `useState`. A local `Modal`
   * overlays the parent without unmounting it.
   */
  local?: boolean;
}

export default function ConfirmingButton({
  children,
  modal,
  local = false,
  ...buttonProps
}: ConfirmingButtonProps) {
  const [localOpened, setLocalOpened] = useState(false);

  const openConfirmModal = () => {
    modals.openConfirmModal(modal);
  };

  if (local) {
    return (
      <>
        <Button {...buttonProps} onClick={() => setLocalOpened(true)}>
          {children}
        </Button>
        <LocalConfirmModal
          opened={localOpened}
          onClose={() => setLocalOpened(false)}
          {...modal}
        >
          {modal.children}
        </LocalConfirmModal>
      </>
    );
  }

  return (
    <Button {...buttonProps} onClick={() => openConfirmModal()}>
      {children}
    </Button>
  )
}