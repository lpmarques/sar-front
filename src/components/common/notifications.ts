import { notifications } from '@mantine/notifications';
import classes from './notifications.module.css';

export function showError(message: string, title='Erro') {
  notifications.show({
    title: title,
    message: message,
    classNames: classes,
    color: 'red',
    autoClose: 10000
  });
}

export function showSuccess(message: string, title='Sucesso') {
  notifications.show({
    title: title,
    message: message,
    classNames: classes,
    color: 'green',
    autoClose: 5000
  });
}
