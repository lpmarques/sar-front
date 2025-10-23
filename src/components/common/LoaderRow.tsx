import { Loader, Table } from "@mantine/core";

interface LoaderRowProps {
  colSpan: number,
}

export default function LoaderRow({ colSpan }: LoaderRowProps) {
  return (
    <Table.Tr>
      <Table.Td colSpan={colSpan} align="center">
        <Loader/>
      </Table.Td>
    </Table.Tr>
  )
}