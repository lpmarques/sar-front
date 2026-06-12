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

import { Text, TextProps, Tooltip } from "@mantine/core";
import classes from '../common/Clickable.module.css';

interface ClickableText extends TextProps {
  children: React.ReactNode,
  path?: string,
  target?: string,
  onClick?: React.MouseEventHandler<HTMLParagraphElement>,
  title?: string,
}

export default function ClickableText({ children, path=".", target='_blank', onClick, title, ...props }: ClickableText) {
  const action = onClick ?? (() => window.open(path, target));

  const text = (
    <Text span {...props} onClick={action} className={classes.text}>
      {children}
    </Text>
  );
  
  if (title)
    return <Tooltip label={title}>
      {text}
    </Tooltip>

  return text
}
