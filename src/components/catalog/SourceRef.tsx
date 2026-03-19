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

import { TextProps } from '@mantine/core';
import { modals } from '@mantine/modals';
import ClickableText from '../common/ClickableText';
import { SourceDetails } from '.';

export interface SourceRefProps extends TextProps {
  sourceId: number,
}

export default function SourceRef({ sourceId, ...textProps }: SourceRefProps) {
  const openSourceDetailsModal = () => modals.open({
    title: `Fonte [${sourceId}]`,
    children: <SourceDetails sourceId={sourceId} />
  });

  return (
    <ClickableText onClick={() => openSourceDetailsModal()} {...textProps}>
      [{sourceId}]
    </ClickableText>
  )
}
