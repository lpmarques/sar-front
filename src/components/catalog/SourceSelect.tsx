import { useMemo } from 'react';
import { Modal, Select, Button, Group, GroupProps, SelectProps, Space } from '@mantine/core';
import { UseFieldReturnType } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSourceList, SourceReadData } from '../../apis/core';
import { useAuth } from '../../hooks/useAuth';
import { SourceDetails, SourceForm } from '.';

interface SourceSelectProps extends SelectProps {
  field: UseFieldReturnType<string | undefined>,
  groupProps?: GroupProps,
}

export default function SourceSelect({ field, groupProps, ...selectProps }: SourceSelectProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [opened, {open, close}] = useDisclosure(false);

  const sourcesQueryOptions = {
    queryKey: ['sourceList'],
    queryFn: getSourceList,
  }
  const sources = useQuery(sourcesQueryOptions);

  const visibleSources = useMemo(() => {
    // TODO: implement filters on source endpoint, allowing for separate querying of user-created sources and static sources, with no need of client-side deduplication
    const staticSources = sources.data ? sources.data.filter((source) => source.isStatic) : [];
    const userSources = sources.data ? sources.data.filter((source) => source.creatorId == user?.id) : [];
    return userSources.concat(staticSources).sort(
      (a, b) => a.id - b.id
    ).reduce(
      (unique: SourceReadData[], item) => {
        if (unique.length === 0 || item !== unique[unique.length-1])
          unique.push(item);
        return unique;
      }, []
    );
  }, [sources]);

  const sourceOptions = visibleSources.map((source: SourceReadData) => {
    const title = source.fieldValues.find(item => item.field === "Título")?.value;
    return {
      value: source.id.toString(),
      label: `[${source.id}] ` + source.type + (title ? `: ${title}` : "")
    }
  });
  
  const handleNewSourceButtonClick = () => {
    field.reset();
    open();
  }

  const handleNewSourceSubmit = (newSourceId: number) => {
    queryClient.invalidateQueries(sourcesQueryOptions);
    field.setValue(String(newSourceId));
    close();
  }
  
  const selectedSource = visibleSources.find(source => source.id === Number(field.getValue()));

  return (
    <>
    <Group gap={10} align="center" justify="center" {...groupProps}>
      <Select
        key={field.key}
        data={sourceOptions}
        searchable
        aria-label="Fonte"
        {...field.getInputProps()}
        {...selectProps}
        />
      <Button size="sm" color="teal" title="Cadastrar nova fonte" onClick={handleNewSourceButtonClick}><IconPlus /></Button>
    </Group>
    { selectedSource && <>
    <Space h="20" />
    <SourceDetails sourceData={selectedSource} />
    </>}
    <Modal opened={opened} onClose={close} title="Procurou uma fonte e não achou? Cadastre-a aqui:">
      <SourceForm onSubmit={handleNewSourceSubmit}/>
    </Modal>
    </>
  )
}
