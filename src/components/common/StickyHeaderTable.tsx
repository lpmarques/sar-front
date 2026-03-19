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
        <Table.Thead 
          className={clsx(classes.header, { [classes.scrolled]: scrolled })}
          style={headerStyle}
        >
          {header}
        </Table.Thead>
        <Table.Tbody>
          {rows}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
