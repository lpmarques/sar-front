import { Button, Group } from "@mantine/core"
import { modals } from "@mantine/modals"

export function openAlertModal({ title, message }: { title: React.ReactNode, message: React.ReactNode }) {
  modals.open({
    title,
    children: <>
      <p>{message}</p>
      <Group justify="flex-end">
        <Button onClick={() => modals.closeAll()}>OK</Button>
      </Group>
    </>
  });
}