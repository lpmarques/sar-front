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

interface ConfirmingButtonProps extends Omit<ButtonProps, 'onClick'> {
  children: React.ReactNode,
  modalTitle: string,
  modalContent: React.ReactNode,
  modalLabels: {
    confirm: string,
    cancel: string,
  },
  modalConfirmProps: (ButtonProps & Omit<React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>, "ref"> & Record<`data-${string}`, any>) | undefined,
  onModalConfirm: () => void,
}

export default function ConfirmingButton({ children, modalTitle, modalContent, modalLabels, modalConfirmProps, onModalConfirm, ...buttonProps }: ConfirmingButtonProps) {
  const openConfirmModal = () => {
    modals.openConfirmModal({
      title: modalTitle,
      children: modalContent,
      labels: modalLabels,
      confirmProps: modalConfirmProps,
      onConfirm: onModalConfirm,
    });
  }
  
  return (
    <Button {...buttonProps} onClick={() => openConfirmModal()}>
      {children}
    </Button>
  )
}
