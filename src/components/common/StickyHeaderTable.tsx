import clsx from 'clsx';
import { useState, ReactElement } from 'react';
import { MantineStyleProp, Table, TableProps } from '@mantine/core';
import classes from './StickyHeaderTable.module.css';

interface StickyHeaderTableProps extends TableProps {
  header: ReactElement,
  rows: ReactElement[],
  scrollWidth: number,
  scrollHeight: number,
  headerStyle?: MantineStyleProp,
}

export function StickyHeaderTable ({ header, rows, scrollWidth, scrollHeight, headerStyle, ...tableProps }: StickyHeaderTableProps) {
  const [scrolled, setScrolled] = useState(false);

  return (
    <Table.ScrollContainer 
      minWidth={scrollWidth}
      maxHeight={scrollHeight}
      scrollAreaProps={{ type: 'always' }}
      onScrollCapture={() => setScrolled(true)}
      onScrollEndCapture={() => setScrolled(false)}
    >
      <Table withRowBorders {...tableProps}>
        <Table.Thead className={clsx(classes.header, { [classes.scrolled]: scrolled })} style={headerStyle}>
          {header}
        </Table.Thead>
        <Table.Tbody>
          {rows}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
