import clsx from 'clsx';
import { useState, ReactElement } from 'react';
import { Table, TableProps } from '@mantine/core';
import classes from './StickyHeaderTable.module.css';

interface StickyHeaderTableProps extends TableProps {
  header: ReactElement,
  rows: ReactElement[],
  scrollWidth: number,
  scrollHeight: number,
}

export default function StickyHeaderTable ({ header, rows, scrollWidth, scrollHeight, ...tableProps }: StickyHeaderTableProps) {
  const [scrolled, setScrolled] = useState(false);

  return (
    <Table.ScrollContainer minWidth={scrollWidth} maxHeight={scrollHeight} onScrollCapture={() => setScrolled(true)} onScrollEndCapture={() => setScrolled(false)}>
      <Table withRowBorders {...tableProps}>
        <Table.Thead className={clsx(classes.header, { [classes.scrolled]: scrolled })}>
          {header}
        </Table.Thead>
        <Table.Tbody>
          {rows}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
