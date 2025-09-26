import { MantineStyleProp, Table, TableTrProps } from "@mantine/core";
import classes from '../common/Clickable.module.css';

interface ClickableRow extends TableTrProps {
  children: React.ReactNode,
  style?: MantineStyleProp,
}

export default function ClickableRow({ children, style, ...props }: ClickableRow) {
  const defaultStyle = {
    '--hover-color': 'var(--mantine-color-gray-1)',
  };

  return (
    <Table.Tr {...props} className={classes.row} style={{...defaultStyle, ...style}}>
      {children}
    </Table.Tr>
  )
}
