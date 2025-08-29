import { Text, UnstyledButton } from '@mantine/core';
import { SourceReadData, sourceTypeToText } from '../../apis/core';
import classes from '../common/Clickable.module.css';

export default function SourceContent({ data }: { data: SourceReadData }) {
  const titleProps = data.url ? {
    onClick: () => window.open(data.url),
    className: classes.text
  } : {};
  
  return (
    <>
      <Text pb={10}><Text span c="dimmed">Título:</Text> <span {...titleProps}>{data.publicationTitle}</span></Text>
      <Text pb={10}><Text span c="dimmed">Tipo:</Text> <span>{sourceTypeToText[data.type]}</span></Text>
      {data.publicationAuthors && <Text pb={10}><Text span c="dimmed">Autoria:</Text> <span>{data.publicationAuthors.join("; ")}</span></Text>}
      <Text pb={10}><Text span c="dimmed">Ano:</Text> <span>{data.year}</span></Text>
      {data.publisher && <Text pb={10}><Text span c="dimmed">Publicado por:</Text> <span>{data.publisher}</span></Text>}
    </>
  )
}
