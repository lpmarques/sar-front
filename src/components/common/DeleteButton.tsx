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

import { Button, ButtonProps } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import ConfirmingButton, { ConfirmModalProps } from "./ConfirmingButton";

interface DeleteButtonProps extends ButtonProps {
  confirmModal?: Omit<ConfirmModalProps, 'labels' | 'confirmProps'> & {
    /**
     * Pass-through to the underlying `ConfirmingButton`. Set to `true` when
     * this button is rendered inside another modal so the confirmation
     * overlays the parent without unmounting its children.
     */
    local?: boolean;
  };
  onClick?: () => void;
}

export default function DeleteButton({ confirmModal, onClick, ...otherButtonProps }: DeleteButtonProps) {

  const buttonProps = {
    variant: "outline",
    size: "compact-md",
    color: "red",
    ...otherButtonProps,
  };

  if (confirmModal) {
    return (
      <ConfirmingButton
        {...buttonProps}
        modal={{
          ...confirmModal,
          labels: { confirm: 'Excluir', cancel: 'Cancelar exclusão' },
          confirmProps: { color: 'red' },
        }}
        local={confirmModal.local}
      >
        <IconTrash size={20} />
      </ConfirmingButton>
    )
  }

  return (
    <Button {...buttonProps} onClick={onClick}>
      <IconTrash size={20} />
    </Button>
  )
}