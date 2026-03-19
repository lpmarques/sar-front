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

import { Center, Text, Tooltip } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

type TipProps = {
  label: string
}

export default function InputTip(props: TipProps) {
  return (
  <Tooltip
    label={props.label}
    position="top-end"
    withArrow
    transitionProps={{ transition: 'pop-bottom-right' }}
  >
    <Text component="div" c="dimmed" style={{ cursor: 'help' }}>
      <Center>
        <IconInfoCircle size={18} stroke={1.5} />
      </Center>
    </Text>
  </Tooltip>
  )
}