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
