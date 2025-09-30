import { Table } from "@mantine/core";
import ClickableRow, { ClickableRowProps } from "./ClickableRow";
import { IconCircleDashedPlus } from "@tabler/icons-react";

interface AddRowProps extends Omit<ClickableRowProps, 'children'> {
  colSpan: number,
}

export default function AddRow({ colSpan, ...clickableRowProps }: AddRowProps) {
  return (
    <ClickableRow {...clickableRowProps}>
      <Table.Td colSpan={colSpan} align="center">
        <IconCircleDashedPlus color="var(--mantine-color-gray-5)" size={35}/>
      </Table.Td>
    </ClickableRow>
  )
}