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

import { Text, TextProps } from "@mantine/core";
import classes from '../common/Clickable.module.css';

interface ClickableText extends TextProps {
  children: React.ReactNode,
  onClick: React.MouseEventHandler<HTMLParagraphElement>,
}

export default function ClickableText({ children, onClick, ...props }: ClickableText) {
  return (
    <Text {...props} onClick={onClick} className={classes.text}>
      {children}
    </Text>
  )
}
