import { Text } from '@mantine/core';
import { SourceReadData, sourceTypeToText } from '../../apis/core';

export default function SourceContent({ data }: { data: SourceReadData }) {
  return (
    <div  style={{cursor: 'pointer'}} onClick={() => window.open(data.url)}>
      <Text pb={10}><Text span c="dimmed">Título:</Text> <span>{data.publicationTitle}</span></Text>
      <Text pb={10}><Text span c="dimmed">Tipo:</Text> <span>{sourceTypeToText[data.type]}</span></Text>
      <Text pb={10}><Text span c="dimmed">Ano:</Text> <span>{data.year}</span></Text>
      {data.publicationAuthors && <Text pb={10}><Text span c="dimmed">Autores:</Text> <span>{data.publicationAuthors.join("; ")}</span></Text>}
      <Text pb={10}><Text span c="dimmed">Publicado por:</Text> <span>{data.publisher}</span></Text>
    </div>
  )
}
