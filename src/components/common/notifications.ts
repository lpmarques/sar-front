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

import { notifications } from '@mantine/notifications';
import classes from './notifications.module.css';

export function showError(message: string, title: string | null = null) {
  notifications.show({
    title: title,
    message: message,
    classNames: classes,
    color: 'red',
    autoClose: 10000
  });
}

export function showSuccess(message: string, title: string | null = null) {
  notifications.show({
    title: title,
    message: message,
    classNames: classes,
    color: 'green',
    autoClose: 5000
  });
}
