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

import { Button, ButtonProps } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconTrash } from "@tabler/icons-react";

interface DeleteButtonProps extends Omit<ButtonProps, 'onClick'> {
  modalTitle: string,
  modalContent: React.ReactNode,
  onModalConfirm: () => void,
}

export default function DeleteButton({ modalTitle, modalContent, onModalConfirm, ...buttonProps }: DeleteButtonProps) {
  const openDeleteConfirmModal = () => {
    modals.openConfirmModal({
      title: modalTitle,
      children: modalContent,
      labels: { confirm: 'Excluir', cancel: 'Cancelar exclusão' },
      confirmProps: { color: 'red' },
      onConfirm: onModalConfirm,
    });
  }
  
  return (
    <Button variant="outline" size="compact-md" color="red" {...buttonProps} onClick={() => openDeleteConfirmModal()}>
      <IconTrash size={20} />
    </Button>
  )
}
