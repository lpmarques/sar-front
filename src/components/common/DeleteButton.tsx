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
import ConfirmButton, { ConfirmModalProps } from "./ConfirmButton";

interface DeleteButtonProps extends ButtonProps {
  confirmModal?: Omit<ConfirmModalProps, 'labels' | 'confirmProps'> & {
    submodal?: boolean;
  };
  onClick?: () => void;
}

export default function DeleteButton({ confirmModal, onClick, ...otherButtonProps }: DeleteButtonProps) {
  const buttonProps = {
    variant: "outline",
    color: "red",
    ...otherButtonProps,
  };

  if (confirmModal) {
    return (
      <ConfirmButton
        {...buttonProps}
        modal={{
          ...confirmModal,
          labels: { confirm: 'Excluir', cancel: 'Cancelar exclusão' },
          confirmProps: { color: 'red' },
        }}
        useSubmodal={confirmModal.submodal}
      >
        <IconTrash size={20} />
      </ConfirmButton>
    )
  }

  return (
    <Button {...buttonProps} onClick={onClick}>
      <IconTrash size={20} />
    </Button>
  )
}