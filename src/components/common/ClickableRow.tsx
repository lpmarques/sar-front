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

import { MantineStyleProp, Table, TableTrProps } from "@mantine/core";
import classes from './Clickable.module.css';

export interface ClickableRowProps extends TableTrProps {
  children: React.ReactNode,
  style?: MantineStyleProp,
}

export default function ClickableRow({ children, style, ...props }: ClickableRowProps) {
  const defaultStyle = {
    '--hover-color': 'var(--mantine-color-gray-1)',
  };

  return (
    <Table.Tr {...props} className={classes.row} style={{...defaultStyle, ...style}}>
      {children}
    </Table.Tr>
  )
}
