import { em, Group, Table } from "@mantine/core";
import ClickableRow, { ClickableRowProps } from "./ClickableRow";
import { IconCircleDashedPlus } from "@tabler/icons-react";
import { useMediaQuery } from "@mantine/hooks";

interface AddRowProps extends Omit<ClickableRowProps, 'children'> {
  colSpan: number,
}

export default function AddRow({ colSpan, ...clickableRowProps }: AddRowProps) {
  const isMobile = useMediaQuery(`(max-width: ${em(500)})`);

  const iconsCount = isMobile ? Math.floor((colSpan-1)/3) || 1 : 1;
  const icons = [...Array(iconsCount)].map(() => (
    <IconCircleDashedPlus color="var(--mantine-color-gray-5)" size={35}/>
  ));

  return (
    <ClickableRow {...clickableRowProps}>
      <Table.Td colSpan={colSpan}>
        <Group justify="space-evenly" wrap="nowrap">
          {icons}
        </Group>
      </Table.Td>
    </ClickableRow>
  )
}