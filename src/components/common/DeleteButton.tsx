/*
Simulador Agroflorestal Regenera (SAR)
Copyright (C) 2026  Lucas Marques and Regenera Mata Atlântica

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses>.
*/

import { ButtonProps } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import ConfirmingButton from "./ConfirmingButton";

interface DeleteButtonProps extends Omit<ButtonProps, 'onClick'> {
  modalTitle: string,
  modalContent: React.ReactNode,
  onModalConfirm: () => void,
}

export default function DeleteButton({ modalTitle, modalContent, onModalConfirm, ...buttonProps }: DeleteButtonProps) {
  
  return (
    <ConfirmingButton
      variant="outline"
      size="compact-md"
      color="red"
      {...buttonProps}
      modalTitle={modalTitle}
      modalContent={modalContent}
      modalLabels={{ confirm: 'Excluir', cancel: 'Cancelar exclusão' }}
      modalConfirmProps={{ color: 'red' }}
      onModalConfirm={onModalConfirm}
    >
      <IconTrash size={20} />
    </ConfirmingButton>
  )
}
